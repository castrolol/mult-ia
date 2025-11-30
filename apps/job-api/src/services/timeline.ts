import crypto from 'crypto';
import { getDatabase } from './database.js';
import type {
  TimelineEvent,
  LinkedPenalty,
  LinkedRequirement,
  LinkedObligation,
  UrgencyMetadata,
  RawTimelineEvent,
  ImportanceLevel,
  DateType,
  ExtractedEntity,
} from '../types/entities.js';

/**
 * Gera um ID único para um evento do timeline
 */
function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Serviço para gerenciar o cronograma/timeline de eventos
 * Responsável por criar, vincular e consultar eventos temporais
 */
export class TimelineService {
  private db = getDatabase();
  private collection = this.db.collection<TimelineEvent>('timeline_events');
  private entitiesCollection = this.db.collection<ExtractedEntity>('entities');

  /**
   * Cria um novo evento no timeline
   */
  async createEvent(
    documentId: string,
    data: Omit<TimelineEvent, '_id' | 'id' | 'documentId' | 'createdAt'>
  ): Promise<TimelineEvent> {
    const event: TimelineEvent = {
      id: generateEventId(),
      documentId,
      ...data,
      createdAt: new Date(),
    };

    await this.collection.insertOne(event);
    return event;
  }

  /**
   * Processa eventos brutos extraídos pela IA e cria os eventos do timeline
   */
  async processTimelineEvents(
    documentId: string,
    rawEvents: RawTimelineEvent[],
    entityMap: Map<string, string> // semanticKey -> entityId
  ): Promise<TimelineEvent[]> {
    const createdEvents: TimelineEvent[] = [];
    const eventKeyToId = new Map<string, string>();

    for (const raw of rawEvents) {
      // Resolver vínculos de penalidades
      const linkedPenalties: LinkedPenalty[] = [];
      if (raw.linkedPenaltyKeys) {
        for (const key of raw.linkedPenaltyKeys) {
          const entityId = entityMap.get(key);
          if (entityId) {
            const entity = await this.entitiesCollection.findOne({ id: entityId });
            if (entity && (entity.type === 'MULTA' || entity.type === 'SANCAO')) {
              linkedPenalties.push({
                entityId,
                type: entity.type as 'MULTA' | 'SANCAO',
                description: entity.name,
                value: entity.rawValue,
              });
            }
          }
        }
      }

      // Resolver vínculos de requisitos
      const linkedRequirements: LinkedRequirement[] = [];
      if (raw.linkedRequirementKeys) {
        for (const key of raw.linkedRequirementKeys) {
          const entityId = entityMap.get(key);
          if (entityId) {
            const entity = await this.entitiesCollection.findOne({ id: entityId });
            if (entity && ['REQUISITO', 'CERTIDAO_TECNICA', 'DOCUMENTACAO'].includes(entity.type)) {
              linkedRequirements.push({
                entityId,
                type: entity.type as 'REQUISITO' | 'CERTIDAO_TECNICA' | 'DOCUMENTACAO',
                description: entity.name,
                mandatory: entity.obligationDetails?.mandatory ?? true,
              });
            }
          }
        }
      }

      // Resolver vínculos de obrigações
      const linkedObligations: LinkedObligation[] = [];
      if (raw.linkedObligationKeys) {
        for (const key of raw.linkedObligationKeys) {
          const entityId = entityMap.get(key);
          if (entityId) {
            const entity = await this.entitiesCollection.findOne({ id: entityId });
            if (entity && entity.type === 'OBRIGACAO') {
              linkedObligations.push({
                entityId,
                description: entity.name,
                actionRequired: entity.obligationDetails?.action || entity.rawValue,
              });
            }
          }
        }
      }

      // Resolver vínculos de riscos
      const linkedRiskIds: string[] = [];
      if (raw.linkedRiskKeys) {
        for (const key of raw.linkedRiskKeys) {
          const riskId = entityMap.get(key);
          if (riskId) {
            linkedRiskIds.push(riskId);
          }
        }
      }

      // Calcular urgência
      const urgency: UrgencyMetadata = {
        hasPenalty: linkedPenalties.length > 0,
        penaltyAmount: linkedPenalties[0]?.value,
        blockingForOthers: false, // Será calculado depois
      };

      // Tentar parsear a data
      let date: Date | null = null;
      if (raw.dateNormalized) {
        const parsed = new Date(raw.dateNormalized);
        if (!isNaN(parsed.getTime())) {
          date = parsed;
          // Calcular dias até o deadline
          const now = new Date();
          const diffTime = parsed.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          urgency.daysUntilDeadline = diffDays;
        }
      }

      // Resolver referência relativa
      let relativeTo: TimelineEvent['relativeTo'];
      if (raw.relativeTo) {
        const refEventId = eventKeyToId.get(raw.relativeTo.eventSemanticKey);
        if (refEventId) {
          relativeTo = {
            eventId: refEventId,
            offset: raw.relativeTo.offset,
            unit: raw.relativeTo.unit,
            direction: raw.relativeTo.direction,
          };
        }
      }

      // Resolver sourceEntityId
      const sourceEntityId = entityMap.get(raw.sourceSemanticKey) || raw.sourceSemanticKey;

      const event = await this.createEvent(documentId, {
        date,
        dateRaw: raw.dateRaw,
        dateType: raw.dateType,
        relativeTo,
        eventType: raw.eventType,
        title: raw.title,
        description: raw.description,
        importance: raw.importance,
        actionRequired: raw.actionRequired,
        linkedPenalties,
        linkedRequirements,
        linkedObligations,
        linkedRiskIds,
        urgency,
        tags: raw.tags,
        sourceEntityId,
        sourcePages: [raw.pageNumber],
        commentsCount: 0,
      });

      createdEvents.push(event);
      eventKeyToId.set(raw.sourceSemanticKey, event.id);
    }

    // Calcular blockingForOthers
    await this.calculateBlockingStatus(documentId);

    return createdEvents;
  }

  /**
   * Calcula quais eventos bloqueiam outros
   */
  private async calculateBlockingStatus(documentId: string): Promise<void> {
    const events = await this.getEventsByDocumentId(documentId);
    
    for (const event of events) {
      // Um evento é bloqueante se outro evento depende dele (relativeTo)
      const dependentEvents = events.filter(e => e.relativeTo?.eventId === event.id);
      
      if (dependentEvents.length > 0) {
        await this.collection.updateOne(
          { id: event.id },
          { $set: { 'urgency.blockingForOthers': true } }
        );
      }
    }
  }

  /**
   * Busca todos os eventos de um documento
   */
  async getEventsByDocumentId(documentId: string): Promise<TimelineEvent[]> {
    return this.collection
      .find({ documentId })
      .sort({ date: 1 })
      .toArray();
  }

  /**
   * Busca eventos ordenados por data (timeline view)
   */
  async getTimeline(documentId: string): Promise<TimelineEvent[]> {
    return this.collection
      .find({ documentId, date: { $ne: null } })
      .sort({ date: 1 })
      .toArray();
  }

  /**
   * Busca eventos por importância
   */
  async getEventsByImportance(
    documentId: string,
    importance: ImportanceLevel
  ): Promise<TimelineEvent[]> {
    return this.collection
      .find({ documentId, importance })
      .sort({ date: 1 })
      .toArray();
  }

  /**
   * Busca eventos críticos (próximos e importantes)
   */
  async getCriticalEvents(documentId: string): Promise<TimelineEvent[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.collection
      .find({
        documentId,
        $or: [
          { importance: 'CRITICAL' },
          {
            date: {
              $gte: now,
              $lte: thirtyDaysFromNow,
            },
          },
        ],
      })
      .sort({ date: 1 })
      .toArray();
  }

  /**
   * Busca eventos por tag
   */
  async getEventsByTag(
    documentId: string,
    tag: string
  ): Promise<TimelineEvent[]> {
    return this.collection
      .find({ documentId, tags: tag })
      .sort({ date: 1 })
      .toArray();
  }

  /**
   * Busca evento por ID
   */
  async getEventById(eventId: string): Promise<TimelineEvent | null> {
    return this.collection.findOne({ id: eventId });
  }

  /**
   * Atualiza a urgência de um evento
   */
  async updateUrgency(eventId: string, urgency: Partial<UrgencyMetadata>): Promise<void> {
    const updates: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(urgency)) {
      updates[`urgency.${key}`] = value;
    }
    
    await this.collection.updateOne(
      { id: eventId },
      { $set: updates }
    );
  }

  /**
   * Recalcula daysUntilDeadline para todos os eventos
   */
  async recalculateDeadlines(documentId: string): Promise<void> {
    const events = await this.getEventsByDocumentId(documentId);
    const now = new Date();

    for (const event of events) {
      if (event.date) {
        const diffTime = event.date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        await this.updateUrgency(event.id, { daysUntilDeadline: diffDays });
      }
    }
  }

  /**
   * Adiciona vínculo com penalidade
   */
  async addPenaltyLink(eventId: string, penalty: LinkedPenalty): Promise<void> {
    await this.collection.updateOne(
      { id: eventId },
      { 
        $push: { linkedPenalties: penalty },
        $set: { 'urgency.hasPenalty': true, 'urgency.penaltyAmount': penalty.value }
      }
    );
  }

  /**
   * Adiciona vínculo com requisito
   */
  async addRequirementLink(eventId: string, requirement: LinkedRequirement): Promise<void> {
    await this.collection.updateOne(
      { id: eventId },
      { $push: { linkedRequirements: requirement } }
    );
  }

  /**
   * Adiciona vínculo com obrigação
   */
  async addObligationLink(eventId: string, obligation: LinkedObligation): Promise<void> {
    await this.collection.updateOne(
      { id: eventId },
      { $push: { linkedObligations: obligation } }
    );
  }

  /**
   * Adiciona vínculo com risco
   */
  async addRiskLink(eventId: string, riskId: string): Promise<void> {
    await this.collection.updateOne(
      { id: eventId },
      { $addToSet: { linkedRiskIds: riskId } }
    );
  }

  /**
   * Remove todas os eventos de um documento
   */
  async clearDocumentEvents(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Obtém estatísticas do timeline
   */
  async getTimelineStats(documentId: string): Promise<{
    totalEvents: number;
    byImportance: Record<ImportanceLevel, number>;
    byDateType: Record<DateType, number>;
    upcomingCritical: number;
    withPenalties: number;
    tags: string[];
  }> {
    const events = await this.getEventsByDocumentId(documentId);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const byImportance: Record<ImportanceLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const byDateType: Record<DateType, number> = {
      FIXED: 0,
      RELATIVE: 0,
      RANGE: 0,
    };

    let upcomingCritical = 0;
    let withPenalties = 0;
    const allTags = new Set<string>();

    for (const event of events) {
      byImportance[event.importance]++;
      byDateType[event.dateType]++;

      if (event.linkedPenalties.length > 0) {
        withPenalties++;
      }

      if (event.date && event.date >= now && event.date <= thirtyDaysFromNow) {
        if (event.importance === 'CRITICAL' || event.importance === 'HIGH') {
          upcomingCritical++;
        }
      }

      for (const tag of event.tags) {
        allTags.add(tag);
      }
    }

    return {
      totalEvents: events.length,
      byImportance,
      byDateType,
      upcomingCritical,
      withPenalties,
      tags: Array.from(allTags),
    };
  }

  /**
   * Busca eventos vinculados a uma entidade específica
   */
  async getEventsForEntity(entityId: string): Promise<TimelineEvent[]> {
    return this.collection
      .find({
        $or: [
          { sourceEntityId: entityId },
          { 'linkedPenalties.entityId': entityId },
          { 'linkedRequirements.entityId': entityId },
          { 'linkedObligations.entityId': entityId },
        ],
      })
      .sort({ date: 1 })
      .toArray();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: TimelineService | null = null;

export function getTimelineService(): TimelineService {
  if (!serviceInstance) {
    serviceInstance = new TimelineService();
  }
  return serviceInstance;
}

