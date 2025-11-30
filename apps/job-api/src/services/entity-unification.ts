import { getDatabase } from './database.js';
import {
  generateDeduplicationKey,
  generateEntityId,
  normalizeDate,
  normalizeMonetary,
  normalizePercentage,
  normalizeWarrantyPeriod,
  normalizeDaysPeriod,
  normalizeTime,
} from '../utils/normalizers.js';
import type {
  ExtractedEntity,
  RawExtractedEntity,
  EntityConflict,
  UnificationResult,
  EntitySource,
  EntityType,
  EntityRelation,
  ObligationDetails,
} from '../types/entities.js';

/**
 * Serviço para unificação de entidades extraídas de editais
 * Responsável por normalizar, deduplicar e resolver conflitos
 */
export class EntityUnificationService {
  private db = getDatabase();
  private collection = this.db.collection<ExtractedEntity>('entities');

  /**
   * Processa e unifica uma lista de entidades brutas extraídas pela IA
   */
  async unifyEntities(
    documentId: string,
    rawEntities: RawExtractedEntity[]
  ): Promise<UnificationResult> {
    const result: UnificationResult = {
      entities: [],
      created: 0,
      updated: 0,
      conflictsResolved: 0,
      conflicts: [],
    };

    // Mapa para resolver relacionamentos: semanticKey -> entityId
    const semanticKeyToId = new Map<string, string>();

    // Primeiro passo: criar todas as entidades
    for (const raw of rawEntities) {
      const normalized = this.normalizeEntity(documentId, raw);

      const existing = await this.findBySemanticKey(
        documentId,
        normalized.semanticKey
      );

      if (!existing) {
        const saved = await this.saveEntity(normalized);
        result.entities.push(saved);
        result.created++;
        semanticKeyToId.set(saved.semanticKey, saved.id);
      } else {
        const mergeResult = this.attemptMerge(existing, normalized);

        if (mergeResult.success) {
          const newSource = normalized.sources[0];
          if (newSource) {
            const updated = await this.addSource(existing, newSource);
            result.entities.push(updated);
          } else {
            result.entities.push(existing);
          }
          result.updated++;
          semanticKeyToId.set(existing.semanticKey, existing.id);
        } else {
          const conflict = await this.resolveConflictByConfidence(
            existing,
            normalized
          );
          result.conflicts.push(conflict);
          result.conflictsResolved++;

          const winner =
            conflict.resolution === 'KEPT_EXISTING'
              ? existing
              : normalized;
          result.entities.push(winner);
          semanticKeyToId.set(winner.semanticKey, winner.id);
        }
      }
    }

    // Segundo passo: resolver relacionamentos
    for (const raw of rawEntities) {
      if (raw.relatedSemanticKeys && raw.relatedSemanticKeys.length > 0) {
        const entityId = semanticKeyToId.get(raw.semanticKey);
        if (entityId) {
          const relations: EntityRelation[] = [];
          
          for (const rel of raw.relatedSemanticKeys) {
            const relatedId = semanticKeyToId.get(rel.semanticKey);
            if (relatedId) {
              relations.push({
                entityId: relatedId,
                relationship: rel.relationship,
              });
            }
          }

          if (relations.length > 0) {
            await this.updateRelations(entityId, relations);
          }
        }
      }
    }

    return result;
  }

  /**
   * Normaliza uma entidade bruta extraída pela IA
   */
  private normalizeEntity(
    documentId: string,
    raw: RawExtractedEntity
  ): ExtractedEntity {
    const normalizedValue = this.normalizeValue(raw.type, raw.rawValue, raw.metadata);

    const source: EntitySource = {
      pageNumber: raw.pageNumber,
      excerpt: raw.excerptText.slice(0, 300),
      confidence: raw.confidence,
    };

    // Converter obligationDetails se existir
    let obligationDetails: ObligationDetails | undefined;
    if (raw.obligationDetails) {
      obligationDetails = {
        action: raw.obligationDetails.action,
        responsible: raw.obligationDetails.responsible,
        mandatory: raw.obligationDetails.mandatory,
        linkedDeadlineId: raw.obligationDetails.linkedDeadlineKey, // Será resolvido depois
      };
    }

    return {
      id: generateEntityId(),
      documentId,
      type: raw.type,
      semanticKey: raw.semanticKey,
      name: raw.name,
      rawValue: raw.rawValue,
      normalizedValue,
      sectionId: raw.sectionId,
      metadata: raw.metadata,
      obligationDetails,
      sources: [source],
      relatedEntities: [],
      confidence: raw.confidence,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Normaliza o valor baseado no tipo da entidade
   */
  private normalizeValue(
    type: EntityType,
    rawValue: string,
    metadata: Record<string, unknown>
  ): string {
    switch (type) {
      case 'PRAZO':
      case 'DATA': {
        const date = normalizeDate(rawValue);
        const time = normalizeTime(rawValue);
        if (date && time) {
          return `${date}T${time}`;
        }
        if (date) {
          return date;
        }
        const days = normalizeDaysPeriod(rawValue);
        if (days) {
          return `${days.days}${days.businessDays ? 'DU' : 'DC'}`;
        }
        const months = normalizeWarrantyPeriod(rawValue);
        if (months) {
          return `${months}M`;
        }
        return rawValue;
      }

      case 'MULTA':
      case 'SANCAO': {
        const percentage = normalizePercentage(rawValue);
        if (percentage !== null) {
          return `${percentage}`;
        }
        const monetary = normalizeMonetary(rawValue);
        if (monetary !== null) {
          return `${monetary}`;
        }
        return rawValue;
      }

      case 'REQUISITO':
      case 'CERTIDAO_TECNICA':
      case 'DOCUMENTACAO': {
        const categoria = metadata.categoria || metadata.tipoDocumento || '';
        const item = metadata.itemRelacionado || metadata.tipoCertidao || '';
        return `${categoria}:${item}`.toUpperCase().replace(/\s+/g, '_');
      }

      case 'OBRIGACAO': {
        const action = metadata.action || rawValue;
        return String(action).toUpperCase().replace(/\s+/g, '_').slice(0, 100);
      }

      default:
        return rawValue.toUpperCase().replace(/\s+/g, '_').slice(0, 100);
    }
  }

  /**
   * Busca entidade existente pela semanticKey
   */
  async findBySemanticKey(
    documentId: string,
    semanticKey: string
  ): Promise<ExtractedEntity | null> {
    return this.collection.findOne({
      documentId,
      semanticKey,
    });
  }

  /**
   * @deprecated Use findBySemanticKey
   */
  async findByDeduplicationKey(
    documentId: string,
    deduplicationKey: string
  ): Promise<ExtractedEntity | null> {
    return this.findBySemanticKey(documentId, deduplicationKey);
  }

  /**
   * Busca entidades por documento
   */
  async findByDocumentId(documentId: string): Promise<ExtractedEntity[]> {
    return this.collection.find({ documentId }).toArray();
  }

  /**
   * Conta entidades por tipo (otimizado com aggregation)
   */
  async countByType(documentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    const pipeline = [
      { $match: { documentId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ];
    
    const results = await this.collection.aggregate<{ _id: string; count: number }>(pipeline).toArray();
    
    const byType: Record<string, number> = {};
    let total = 0;
    
    for (const result of results) {
      byType[result._id] = result.count;
      total += result.count;
    }
    
    return { total, byType };
  }

  /**
   * Busca entidades por tipo
   */
  async findByType(
    documentId: string,
    type: EntityType
  ): Promise<ExtractedEntity[]> {
    return this.collection.find({ documentId, type }).toArray();
  }

  /**
   * Retorna todas as semantic keys de um documento
   */
  async getExistingSemanticKeys(documentId: string): Promise<string[]> {
    const entities = await this.collection
      .find({ documentId }, { projection: { semanticKey: 1 } })
      .toArray();
    return entities.map((e) => e.semanticKey);
  }

  /**
   * Tenta fazer merge de duas entidades
   */
  private attemptMerge(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): { success: boolean; reason?: string } {
    if (existing.normalizedValue === incoming.normalizedValue) {
      return { success: true };
    }

    if (this.isAcceptableVariation(existing, incoming)) {
      return { success: true };
    }

    return {
      success: false,
      reason: `Valor diferente: "${existing.normalizedValue}" vs "${incoming.normalizedValue}"`,
    };
  }

  /**
   * Verifica se a variação entre duas entidades é aceitável
   */
  private isAcceptableVariation(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): boolean {
    const existingNum = parseFloat(existing.normalizedValue);
    const incomingNum = parseFloat(incoming.normalizedValue);

    if (!isNaN(existingNum) && !isNaN(incomingNum)) {
      const diff = Math.abs(existingNum - incomingNum);
      const tolerance = Math.max(existingNum, incomingNum) * 0.001;
      return diff <= tolerance;
    }

    const existingNorm = existing.normalizedValue
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const incomingNorm = incoming.normalizedValue
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return existingNorm === incomingNorm;
  }

  /**
   * Resolve conflito mantendo a entidade com maior confiança
   */
  private async resolveConflictByConfidence(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): Promise<EntityConflict> {
    const conflict: EntityConflict = {
      semanticKey: existing.semanticKey,
      existingEntity: existing,
      incomingEntity: incoming,
      conflictType: 'VALUE_MISMATCH',
      resolution: 'KEPT_EXISTING',
      detectedAt: new Date(),
    };

    if (incoming.confidence > existing.confidence) {
      const mergedSources = [
        ...existing.sources,
        ...incoming.sources.filter(
          (s) =>
            !existing.sources.some(
              (es) =>
                es.pageNumber === s.pageNumber &&
                es.excerpt === s.excerpt
            )
        ),
      ];

      await this.collection.updateOne(
        { id: existing.id },
        {
          $set: {
            rawValue: incoming.rawValue,
            normalizedValue: incoming.normalizedValue,
            metadata: incoming.metadata,
            confidence: incoming.confidence,
            sources: mergedSources,
            updatedAt: new Date(),
          },
        }
      );

      conflict.resolution = 'REPLACED_WITH_INCOMING';
    } else {
      const incomingSource = incoming.sources[0];
      if (incomingSource) {
        await this.addSource(existing, incomingSource);
      }
      conflict.resolution = 'KEPT_EXISTING';
    }

    return conflict;
  }

  /**
   * Adiciona nova fonte a uma entidade existente
   */
  private async addSource(
    entity: ExtractedEntity,
    source: EntitySource
  ): Promise<ExtractedEntity> {
    const existingSource = entity.sources.find(
      (s) =>
        s.pageNumber === source.pageNumber &&
        s.excerpt === source.excerpt
    );

    if (!existingSource) {
      entity.sources.push(source);
      await this.collection.updateOne(
        { id: entity.id },
        {
          $push: { sources: source },
          $set: { updatedAt: new Date() },
        }
      );
    }

    return entity;
  }

  /**
   * Atualiza os relacionamentos de uma entidade
   */
  private async updateRelations(
    entityId: string,
    relations: EntityRelation[]
  ): Promise<void> {
    await this.collection.updateOne(
      { id: entityId },
      {
        $set: { 
          relatedEntities: relations,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Adiciona relacionamento a uma entidade
   */
  async addRelation(
    entityId: string,
    relation: EntityRelation
  ): Promise<void> {
    await this.collection.updateOne(
      { id: entityId },
      {
        $addToSet: { relatedEntities: relation },
        $set: { updatedAt: new Date() },
      }
    );
  }

  /**
   * Salva uma nova entidade no banco
   */
  private async saveEntity(entity: ExtractedEntity): Promise<ExtractedEntity> {
    await this.collection.insertOne(entity);
    return entity;
  }

  /**
   * Remove todas as entidades de um documento
   */
  async clearDocumentEntities(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Busca entidade por ID
   */
  async findById(entityId: string): Promise<ExtractedEntity | null> {
    return this.collection.findOne({ id: entityId });
  }

  /**
   * Busca entidades relacionadas a uma entidade
   */
  async findRelatedEntities(entityId: string): Promise<ExtractedEntity[]> {
    const entity = await this.findById(entityId);
    if (!entity || !entity.relatedEntities.length) {
      return [];
    }

    const relatedIds = entity.relatedEntities.map(r => r.entityId);
    return this.collection.find({ id: { $in: relatedIds } }).toArray();
  }

  /**
   * Busca entidades por seção
   */
  async findBySectionId(sectionId: string): Promise<ExtractedEntity[]> {
    return this.collection.find({ sectionId }).toArray();
  }
}

// Singleton para reutilização
let serviceInstance: EntityUnificationService | null = null;

export function getEntityUnificationService(): EntityUnificationService {
  if (!serviceInstance) {
    serviceInstance = new EntityUnificationService();
  }
  return serviceInstance;
}
