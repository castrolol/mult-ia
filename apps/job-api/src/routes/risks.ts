import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { getRiskService } from '../services/risk.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import { getTimelineService } from '../services/timeline.js';
import type { PDFDocument, Risk, ExtractedEntity, TimelineEvent } from '../types/index.js';

const risks = new Hono();

// ============================================================================
// TIPOS PARA RESPOSTA ENRIQUECIDA
// ============================================================================

interface LinkedEntitySummary {
  id: string;
  type: string;
  name: string;
  semanticKey: string;
  rawValue: string;
}

interface LinkedTimelineSummary {
  id: string;
  title: string;
  date: Date | null;
  eventType: string;
  importance: string;
}

interface EnrichedRisk extends Omit<Risk, 'linkedEntityIds' | 'linkedTimelineIds'> {
  score?: number;
  linkedEntities: LinkedEntitySummary[];
  linkedTimeline: LinkedTimelineSummary[];
}

// ============================================================================
// FUNÇÃO DE ENRIQUECIMENTO (OTIMIZADA)
// ============================================================================

/**
 * Enriquece riscos com entidades e timeline vinculados
 * Faz apenas 2 queries ao banco (entidades + timeline) independente do número de riscos
 */
async function enrichRisksWithLinkedData(risksList: (Risk & { score?: number })[]): Promise<EnrichedRisk[]> {
  // Coletar todos os IDs únicos
  const allEntityIds = new Set<string>();
  const allTimelineIds = new Set<string>();
  
  for (const risk of risksList) {
    for (const id of risk.linkedEntityIds || []) {
      allEntityIds.add(id);
    }
    for (const id of risk.linkedTimelineIds || []) {
      allTimelineIds.add(id);
    }
  }
  
  // Buscar dados em paralelo (apenas 2 queries)
  const [entities, timelineEvents] = await Promise.all([
    allEntityIds.size > 0 
      ? getDatabase().collection<ExtractedEntity>('entities')
          .find({ id: { $in: Array.from(allEntityIds) } })
          .project({ id: 1, type: 1, name: 1, semanticKey: 1, rawValue: 1 })
          .toArray()
      : Promise.resolve([]),
    allTimelineIds.size > 0
      ? getDatabase().collection<TimelineEvent>('timeline_events')
          .find({ id: { $in: Array.from(allTimelineIds) } })
          .project({ id: 1, title: 1, date: 1, eventType: 1, importance: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);
  
  // Criar mapas para lookup O(1)
  const entityMap = new Map<string, LinkedEntitySummary>();
  for (const e of entities) {
    entityMap.set(e.id, {
      id: e.id,
      type: e.type,
      name: e.name,
      semanticKey: e.semanticKey,
      rawValue: e.rawValue,
    });
  }
  
  const timelineMap = new Map<string, LinkedTimelineSummary>();
  for (const t of timelineEvents) {
    timelineMap.set(t.id, {
      id: t.id,
      title: t.title,
      date: t.date,
      eventType: t.eventType,
      importance: t.importance,
    });
  }
  
  // Enriquecer cada risco
  return risksList.map(risk => {
    const linkedEntities: LinkedEntitySummary[] = [];
    for (const id of risk.linkedEntityIds || []) {
      const entity = entityMap.get(id);
      if (entity) linkedEntities.push(entity);
    }
    
    const linkedTimeline: LinkedTimelineSummary[] = [];
    for (const id of risk.linkedTimelineIds || []) {
      const event = timelineMap.get(id);
      if (event) linkedTimeline.push(event);
    }
    
    return {
      id: risk.id,
      documentId: risk.documentId,
      category: risk.category,
      subcategory: risk.subcategory,
      title: risk.title,
      description: risk.description,
      trigger: risk.trigger,
      consequence: risk.consequence,
      severity: risk.severity,
      probability: risk.probability,
      score: risk.score,
      mitigation: risk.mitigation,
      linkedEntities,
      linkedTimeline,
      linkedSectionIds: risk.linkedSectionIds,
      sources: risk.sources,
      createdAt: risk.createdAt,
    };
  });
}

/**
 * GET /risks/:documentId
 * Lista todos os riscos de um documento
 */
risks.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    // Parâmetros de filtro
    const category = c.req.query('category');
    const severity = c.req.query('severity');
    const sortBy = c.req.query('sortBy') || 'score'; // score, severity, probability
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    const riskService = getRiskService();
    
    // Verificar se documento existe
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Buscar riscos
    let risksList: (Risk & { score?: number })[];
    
    if (category) {
      risksList = await riskService.getRisksByCategory(documentId, category);
    } else if (severity) {
      risksList = await riskService.getRisksBySeverity(
        documentId, 
        severity.toUpperCase() as Risk['severity']
      );
    } else if (sortBy === 'score') {
      risksList = await riskService.getRisksByScore(documentId);
    } else {
      risksList = await riskService.getRisksByDocumentId(documentId);
    }
    
    // Enriquecer com entidades vinculadas (otimizado: 2 queries)
    const [enrichedRisks, stats] = await Promise.all([
      enrichRisksWithLinkedData(risksList),
      riskService.getRiskStats(documentId),
    ]);
    
    return c.json({
      documentId,
      risks: enrichedRisks,
      stats: {
        total: stats.totalRisks,
        bySeverity: stats.bySeverity,
        byProbability: stats.byProbability,
        byCategory: stats.byCategory,
        withMitigation: stats.withMitigation,
        criticalCount: stats.criticalCount,
      },
      categories: Object.keys(stats.byCategory),
    });
  } catch (error) {
    console.error('Erro ao listar riscos:', error);
    return c.json({ error: 'Erro ao listar riscos' }, 500);
  }
});

/**
 * GET /risks/:documentId/critical
 * Lista apenas riscos críticos
 */
risks.get('/:documentId/critical', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const riskService = getRiskService();
    
    const criticalRisks = await riskService.getCriticalRisks(documentId);
    const enrichedRisks = await enrichRisksWithLinkedData(criticalRisks);
    
    return c.json({
      documentId,
      risks: enrichedRisks,
      total: enrichedRisks.length,
    });
  } catch (error) {
    console.error('Erro ao buscar riscos críticos:', error);
    return c.json({ error: 'Erro ao buscar riscos críticos' }, 500);
  }
});

/**
 * GET /risks/:documentId/needing-mitigation
 * Lista riscos que precisam de mitigação
 */
risks.get('/:documentId/needing-mitigation', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const riskService = getRiskService();
    
    const risksNeedingMitigation = await riskService.getRisksNeedingMitigation(documentId);
    const enrichedRisks = await enrichRisksWithLinkedData(risksNeedingMitigation);
    
    return c.json({
      documentId,
      risks: enrichedRisks,
      total: enrichedRisks.length,
    });
  } catch (error) {
    console.error('Erro ao buscar riscos sem mitigação:', error);
    return c.json({ error: 'Erro ao buscar riscos sem mitigação' }, 500);
  }
});

/**
 * GET /risks/:documentId/by-category
 * Lista riscos agrupados por categoria
 */
risks.get('/:documentId/by-category', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const riskService = getRiskService();
    
    // Buscar todas as categorias
    const categories = await riskService.getCategories(documentId);
    
    // Buscar riscos por categoria
    const byCategory = await Promise.all(
      categories.map(async (category) => {
        const categoryRisks = await riskService.getRisksByCategory(documentId, category);
        const enrichedRisks = await enrichRisksWithLinkedData(categoryRisks);
        return {
          category,
          risks: enrichedRisks,
          count: enrichedRisks.length,
          criticalCount: categoryRisks.filter(r => 
            r.severity === 'CRITICAL' || r.severity === 'HIGH'
          ).length,
        };
      })
    );
    
    // Ordenar por quantidade de críticos
    byCategory.sort((a, b) => b.criticalCount - a.criticalCount);
    
    return c.json({
      documentId,
      categories: byCategory,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error('Erro ao agrupar por categoria:', error);
    return c.json({ error: 'Erro ao agrupar por categoria' }, 500);
  }
});

/**
 * GET /risks/:documentId/:riskId
 * Retorna detalhes de um risco específico
 */
risks.get('/:documentId/:riskId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const riskId = c.req.param('riskId');
    
    const riskService = getRiskService();
    
    const risk = await riskService.getRiskById(riskId);
    
    if (!risk || risk.documentId !== documentId) {
      return c.json({ error: 'Risco não encontrado' }, 404);
    }
    
    // Calcular score e enriquecer
    const score = riskService.calculateRiskScore(risk);
    const [enrichedRisk] = await enrichRisksWithLinkedData([{ ...risk, score }]);
    
    return c.json(enrichedRisk);
  } catch (error) {
    console.error('Erro ao buscar risco:', error);
    return c.json({ error: 'Erro ao buscar risco' }, 500);
  }
});

export { risks };

