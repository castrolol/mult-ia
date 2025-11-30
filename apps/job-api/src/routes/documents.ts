import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { getSignedUrl } from '../services/storage.js';
import { getPageService } from '../services/page.js';
import { getDocumentStructureService } from '../services/document-structure.js';
import { getTimelineService } from '../services/timeline.js';
import { getRiskService } from '../services/risk.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import type { PDFDocument } from '../types/index.js';

const documents = new Hono();

/**
 * GET /documents
 * Lista todos os documentos com status de processamento
 */
documents.get('/', async (c) => {
  try {
    const db = getDatabase();
    const pageService = getPageService();
    
    // Parâmetros de paginação
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const skip = (page - 1) * limit;
    
    // Filtro por status (opcional)
    const statusFilter = c.req.query('status');
    const filter: Record<string, unknown> = {};
    if (statusFilter) {
      filter.status = statusFilter.toUpperCase();
    }
    
    // Buscar documentos
    const documentsCollection = db.collection<PDFDocument>('documents');
    
    const [docs, total] = await Promise.all([
      documentsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      documentsCollection.countDocuments(filter),
    ]);
    
    // Enriquecer com estatísticas de processamento
    const enrichedDocs = await Promise.all(
      docs.map(async (doc) => {
        const documentId = doc._id?.toString() || '';
        
        // Calcular porcentagem
        let percentage = 0;
        let currentStage = 'PENDING';
        
        if (doc.status === 'COMPLETED') {
          percentage = 100;
          currentStage = 'COMPLETED';
        } else if (doc.status === 'PROCESSING') {
          if (doc.totalBatches && doc.totalBatches > 0) {
            percentage = Math.round((doc.currentBatch / doc.totalBatches) * 100);
          }
          currentStage = doc.currentBatch === 0 ? 'EXTRACTING_TEXT' : `BATCH_${doc.currentBatch}`;
        } else if (doc.status === 'FAILED') {
          currentStage = 'FAILED';
        }
        
        return {
          id: documentId,
          filename: doc.filename,
          status: doc.status,
          percentage,
          currentStage,
          totalPages: doc.totalPages || 0,
          pagesProcessed: doc.pagesProcessed || 0,
          currentBatch: doc.currentBatch || 0,
          totalBatches: doc.totalBatches || 0,
          error: doc.error,
          createdAt: doc.createdAt,
          processingStartedAt: doc.processingStartedAt,
          processingCompletedAt: doc.processingCompletedAt,
        };
      })
    );
    
    return c.json({
      documents: enrichedDocs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    return c.json({ error: 'Erro ao listar documentos' }, 500);
  }
});

/**
 * GET /documents/:id
 * Retorna metadados completos de um documento
 */
documents.get('/:id', async (c) => {
  try {
    const documentId = c.req.param('id');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    const pageService = getPageService();
    const structureService = getDocumentStructureService();
    const timelineService = getTimelineService();
    const riskService = getRiskService();
    const entityService = getEntityUnificationService();
    
    // Buscar documento
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Buscar estatísticas (todas em paralelo)
    const [pageStats, structureStats, timelineStats, riskStats, entityStats] = await Promise.all([
      pageService.getProcessingStats(documentId),
      structureService.getStructureStats(documentId),
      timelineService.getTimelineStats(documentId),
      riskService.getRiskStats(documentId),
      entityService.countByType(documentId), // Otimizado: usa aggregation
    ]);
    
    // Calcular porcentagem
    let percentage = 0;
    if (doc.status === 'COMPLETED') {
      percentage = 100;
    } else if (doc.status === 'PROCESSING' && doc.totalBatches && doc.totalBatches > 0) {
      percentage = Math.round((doc.currentBatch / doc.totalBatches) * 100);
    }
    
    return c.json({
      id: documentId,
      filename: doc.filename,
      s3Key: doc.s3Key,
      status: doc.status,
      percentage,
      config: doc.config,
      
      // Progresso
      progress: {
        totalPages: doc.totalPages || 0,
        pagesProcessed: doc.pagesProcessed || 0,
        currentBatch: doc.currentBatch || 0,
        totalBatches: doc.totalBatches || 0,
      },
      
      // Estatísticas
      stats: {
        pages: pageStats,
        structure: structureStats,
        timeline: timelineStats,
        risks: riskStats,
        entities: entityStats,
      },
      
      // Timestamps
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      processingStartedAt: doc.processingStartedAt,
      processingCompletedAt: doc.processingCompletedAt,
      
      // Erro (se houver)
      error: doc.error,
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    return c.json({ error: 'Erro ao buscar documento' }, 500);
  }
});

/**
 * GET /documents/:id/pdf-url
 * Retorna URL assinada para visualizar o PDF
 */
documents.get('/:id/pdf-url', async (c) => {
  try {
    const documentId = c.req.param('id');
    const expiresIn = parseInt(c.req.query('expiresIn') || '3600', 10);
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    
    // Buscar documento
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Gerar URL assinada
    const signedUrl = await getSignedUrl(doc.s3Key, expiresIn);
    
    return c.json({
      documentId,
      filename: doc.filename,
      url: signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Erro ao gerar URL assinada:', error);
    return c.json({ error: 'Erro ao gerar URL assinada' }, 500);
  }
});

/**
 * GET /documents/:id/summary
 * Retorna um resumo rápido do documento (para cards/listagens)
 */
documents.get('/:id/summary', async (c) => {
  try {
    const documentId = c.req.param('id');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    const timelineService = getTimelineService();
    const riskService = getRiskService();
    
    // Buscar documento
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Buscar eventos críticos próximos
    const criticalEvents = await timelineService.getCriticalEvents(documentId);
    
    // Buscar riscos críticos
    const criticalRisks = await riskService.getCriticalRisks(documentId);
    
    return c.json({
      id: documentId,
      filename: doc.filename,
      status: doc.status,
      
      // Próximos prazos críticos
      upcomingDeadlines: criticalEvents.slice(0, 5).map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        importance: e.importance,
        daysUntil: e.urgency.daysUntilDeadline,
      })),
      
      // Riscos principais
      topRisks: criticalRisks.slice(0, 3).map(r => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        category: r.category,
      })),
      
      // Contadores
      counts: {
        criticalDeadlines: criticalEvents.length,
        criticalRisks: criticalRisks.length,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    return c.json({ error: 'Erro ao buscar resumo' }, 500);
  }
});

export { documents };

