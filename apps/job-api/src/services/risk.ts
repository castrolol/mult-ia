import crypto from 'crypto';
import { getDatabase } from './database.js';
import type {
  Risk,
  RawRisk,
  RiskMitigation,
  RiskSource,
  ImportanceLevel,
  ProbabilityLevel,
} from '../types/entities.js';

/**
 * Gera um ID único para um risco
 */
function generateRiskId(): string {
  return crypto.randomUUID();
}

/**
 * Serviço para gerenciar riscos identificados em editais
 * Responsável por criar, categorizar e consultar riscos
 */
export class RiskService {
  private db = getDatabase();
  private collection = this.db.collection<Risk>('risks');

  /**
   * Cria um novo risco
   */
  async createRisk(
    documentId: string,
    data: Omit<Risk, '_id' | 'id' | 'documentId' | 'createdAt'>
  ): Promise<Risk> {
    const risk: Risk = {
      id: generateRiskId(),
      documentId,
      ...data,
      createdAt: new Date(),
    };

    await this.collection.insertOne(risk);
    return risk;
  }

  /**
   * Processa riscos brutos extraídos pela IA
   */
  async processRisks(
    documentId: string,
    rawRisks: RawRisk[],
    entityMap: Map<string, string>, // semanticKey -> entityId
    timelineMap: Map<string, string> // semanticKey -> timelineId
  ): Promise<Risk[]> {
    const createdRisks: Risk[] = [];

    for (const raw of rawRisks) {
      // Resolver vínculos de entidades
      const linkedEntityIds: string[] = [];
      if (raw.linkedEntityKeys) {
        for (const key of raw.linkedEntityKeys) {
          const entityId = entityMap.get(key);
          if (entityId) {
            linkedEntityIds.push(entityId);
          }
        }
      }

      // Resolver vínculos de timeline
      const linkedTimelineIds: string[] = [];
      if (raw.linkedTimelineKeys) {
        for (const key of raw.linkedTimelineKeys) {
          const timelineId = timelineMap.get(key);
          if (timelineId) {
            linkedTimelineIds.push(timelineId);
          }
        }
      }

      // Criar fonte
      const sources: RiskSource[] = [{
        pageNumber: raw.pageNumber,
        excerpt: raw.excerpt,
        confidence: raw.confidence,
      }];

      const risk = await this.createRisk(documentId, {
        category: raw.category,
        subcategory: raw.subcategory,
        title: raw.title,
        description: raw.description,
        trigger: raw.trigger,
        consequence: raw.consequence,
        severity: raw.severity,
        probability: raw.probability,
        mitigation: raw.mitigation,
        linkedEntityIds,
        linkedTimelineIds,
        linkedSectionIds: [],
        sources,
      });

      createdRisks.push(risk);
    }

    return createdRisks;
  }

  /**
   * Busca todos os riscos de um documento
   */
  async getRisksByDocumentId(documentId: string): Promise<Risk[]> {
    return this.collection
      .find({ documentId })
      .sort({ severity: -1, probability: -1 })
      .toArray();
  }

  /**
   * Busca riscos por categoria
   */
  async getRisksByCategory(
    documentId: string,
    category: string
  ): Promise<Risk[]> {
    return this.collection
      .find({ documentId, category })
      .sort({ severity: -1 })
      .toArray();
  }

  /**
   * Busca riscos por severidade
   */
  async getRisksBySeverity(
    documentId: string,
    severity: ImportanceLevel
  ): Promise<Risk[]> {
    return this.collection
      .find({ documentId, severity })
      .toArray();
  }

  /**
   * Busca riscos críticos (alta severidade e probabilidade)
   */
  async getCriticalRisks(documentId: string): Promise<Risk[]> {
    return this.collection
      .find({
        documentId,
        $or: [
          { severity: 'CRITICAL' },
          { severity: 'HIGH', probability: { $in: ['CERTAIN', 'LIKELY'] } },
        ],
      })
      .sort({ severity: -1, probability: -1 })
      .toArray();
  }

  /**
   * Busca risco por ID
   */
  async getRiskById(riskId: string): Promise<Risk | null> {
    return this.collection.findOne({ id: riskId });
  }

  /**
   * Busca riscos vinculados a uma entidade
   */
  async getRisksForEntity(entityId: string): Promise<Risk[]> {
    return this.collection
      .find({ linkedEntityIds: entityId })
      .sort({ severity: -1 })
      .toArray();
  }

  /**
   * Busca riscos vinculados a um evento do timeline
   */
  async getRisksForTimelineEvent(timelineEventId: string): Promise<Risk[]> {
    return this.collection
      .find({ linkedTimelineIds: timelineEventId })
      .sort({ severity: -1 })
      .toArray();
  }

  /**
   * Adiciona vínculo com entidade
   */
  async addEntityLink(riskId: string, entityId: string): Promise<void> {
    await this.collection.updateOne(
      { id: riskId },
      { $addToSet: { linkedEntityIds: entityId } }
    );
  }

  /**
   * Adiciona vínculo com evento do timeline
   */
  async addTimelineLink(riskId: string, timelineEventId: string): Promise<void> {
    await this.collection.updateOne(
      { id: riskId },
      { $addToSet: { linkedTimelineIds: timelineEventId } }
    );
  }

  /**
   * Adiciona vínculo com seção do documento
   */
  async addSectionLink(riskId: string, sectionId: string): Promise<void> {
    await this.collection.updateOne(
      { id: riskId },
      { $addToSet: { linkedSectionIds: sectionId } }
    );
  }

  /**
   * Atualiza a mitigação de um risco
   */
  async updateMitigation(riskId: string, mitigation: RiskMitigation): Promise<void> {
    await this.collection.updateOne(
      { id: riskId },
      { $set: { mitigation } }
    );
  }

  /**
   * Adiciona uma nova fonte ao risco
   */
  async addSource(riskId: string, source: RiskSource): Promise<void> {
    await this.collection.updateOne(
      { id: riskId },
      { $push: { sources: source } }
    );
  }

  /**
   * Remove todos os riscos de um documento
   */
  async clearDocumentRisks(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Obtém estatísticas dos riscos
   */
  async getRiskStats(documentId: string): Promise<{
    totalRisks: number;
    bySeverity: Record<ImportanceLevel, number>;
    byProbability: Record<ProbabilityLevel, number>;
    byCategory: Record<string, number>;
    withMitigation: number;
    criticalCount: number;
  }> {
    const risks = await this.getRisksByDocumentId(documentId);

    const bySeverity: Record<ImportanceLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const byProbability: Record<ProbabilityLevel, number> = {
      CERTAIN: 0,
      LIKELY: 0,
      POSSIBLE: 0,
      UNLIKELY: 0,
    };

    const byCategory: Record<string, number> = {};
    let withMitigation = 0;
    let criticalCount = 0;

    for (const risk of risks) {
      bySeverity[risk.severity]++;
      byProbability[risk.probability]++;
      
      byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
      
      if (risk.mitigation) {
        withMitigation++;
      }

      if (risk.severity === 'CRITICAL' || 
          (risk.severity === 'HIGH' && ['CERTAIN', 'LIKELY'].includes(risk.probability))) {
        criticalCount++;
      }
    }

    return {
      totalRisks: risks.length,
      bySeverity,
      byProbability,
      byCategory,
      withMitigation,
      criticalCount,
    };
  }

  /**
   * Obtém todas as categorias de risco de um documento
   */
  async getCategories(documentId: string): Promise<string[]> {
    const risks = await this.getRisksByDocumentId(documentId);
    const categories = new Set<string>();
    
    for (const risk of risks) {
      categories.add(risk.category);
    }
    
    return Array.from(categories).sort();
  }

  /**
   * Calcula score de risco (para ordenação)
   */
  calculateRiskScore(risk: Risk): number {
    const severityScore: Record<ImportanceLevel, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const probabilityScore: Record<ProbabilityLevel, number> = {
      CERTAIN: 4,
      LIKELY: 3,
      POSSIBLE: 2,
      UNLIKELY: 1,
    };

    return severityScore[risk.severity] * probabilityScore[risk.probability];
  }

  /**
   * Busca riscos ordenados por score
   */
  async getRisksByScore(documentId: string): Promise<Array<Risk & { score: number }>> {
    const risks = await this.getRisksByDocumentId(documentId);
    
    return risks
      .map(risk => ({
        ...risk,
        score: this.calculateRiskScore(risk),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Busca riscos que precisam de mitigação urgente
   */
  async getRisksNeedingMitigation(documentId: string): Promise<Risk[]> {
    return this.collection
      .find({
        documentId,
        mitigation: { $exists: false },
        $or: [
          { severity: 'CRITICAL' },
          { severity: 'HIGH' },
          { probability: 'CERTAIN' },
        ],
      })
      .sort({ severity: -1, probability: -1 })
      .toArray();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: RiskService | null = null;

export function getRiskService(): RiskService {
  if (!serviceInstance) {
    serviceInstance = new RiskService();
  }
  return serviceInstance;
}

