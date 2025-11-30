import { ObjectId } from 'mongodb';
import pdfParse from 'pdf-parse';
import { getDatabase } from '../services/database.js';
import { downloadFile } from '../services/storage.js';
import { getBatchProcessorService } from '../services/batch-processor.js';
import { getPageService } from '../services/page.js';
import { getDocumentStructureService } from '../services/document-structure.js';
import { getTimelineService } from '../services/timeline.js';
import { getRiskService } from '../services/risk.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import { getRagService } from '../services/rag.js';
import { analyzeDocumentWithBatches } from '../ai/agent.js';
import type { PDFDocument, ProcessJobData, DocumentConfig } from '../types/index.js';
import { DEFAULT_PROCESSING_CONFIG } from '../types/entities.js';

interface PageContent {
  pageNumber: number;
  text: string;
}

/**
 * Extrai texto de cada página do PDF
 */
async function extractPagesFromPDF(buffer: Buffer): Promise<PageContent[]> {
  const data = await pdfParse(buffer);
  
  const totalPages = data.numpages;
  const fullText = data.text;
  
  const pages: PageContent[] = [];
  
  if (totalPages === 1) {
    pages.push({ pageNumber: 1, text: fullText });
  } else {
    // Estratégia: dividir por marcadores de página ou proporcionalmente
    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / totalPages);
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * linesPerPage;
      const end = Math.min(start + linesPerPage, lines.length);
      const pageText = lines.slice(start, end).join('\n').trim();
      
      if (pageText) {
        pages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }
    }
  }
  
  return pages;
}

/**
 * Atualiza o status do documento no MongoDB
 */
async function updateDocumentStatus(
  documentId: string,
  status: PDFDocument['status'],
  updates: Partial<PDFDocument> = {}
): Promise<void> {
  const db = getDatabase();
  
  await db.collection<PDFDocument>('documents').updateOne(
    { _id: new ObjectId(documentId) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...updates,
      },
    }
  );
}

/**
 * Limpa dados anteriores do documento (para reprocessamento)
 */
async function clearPreviousData(documentId: string): Promise<{
  entities: number;
  pages: number;
  sections: number;
  timeline: number;
  risks: number;
}> {
  const pageService = getPageService();
  const structureService = getDocumentStructureService();
  const timelineService = getTimelineService();
  const riskService = getRiskService();
  const unificationService = getEntityUnificationService();

  const [entities, pages, sections, timeline, risks] = await Promise.all([
    unificationService.clearDocumentEntities(documentId),
    pageService.clearDocumentPages(documentId),
    structureService.clearDocumentSections(documentId),
    timelineService.clearDocumentEvents(documentId),
    riskService.clearDocumentRisks(documentId),
  ]);

  return { entities, pages, sections, timeline, risks };
}

/**
 * Processa um documento PDF (edital de licitação)
 * 
 * Fluxo:
 * 1. Baixa do Minio
 * 2. Extrai texto por página
 * 3. Divide em batches baseado no wordCap
 * 4. Processa cada batch em dois estágios:
 *    - Estágio 1: Estrutura hierárquica
 *    - Estágio 2: Entidades, timeline, riscos
 * 5. Pós-processamento: Consolidação
 */
export async function processDocument(data: ProcessJobData): Promise<void> {
  const { documentId, s3Key, config: customConfig } = data;
  
  // Merge config com defaults
  const config: DocumentConfig = {
    wordCap: customConfig?.wordCap ?? DEFAULT_PROCESSING_CONFIG.wordCap,
    maxPagesPerBatch: customConfig?.maxPagesPerBatch ?? DEFAULT_PROCESSING_CONFIG.maxPagesPerBatch,
  };

  const batchService = getBatchProcessorService();
  const pageService = getPageService();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 PROCESSANDO EDITAL: ${documentId}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   S3 Key: ${s3Key}`);
  console.log(`   Config: wordCap=${config.wordCap}, maxPagesPerBatch=${config.maxPagesPerBatch}`);
  
  try {
    // Atualizar status para PROCESSING
    await updateDocumentStatus(documentId, 'PROCESSING', {
      processingStartedAt: new Date(),
      config,
    });
    
    // Limpar dados anteriores (reprocessamento)
    console.log(`\n🗑️  Limpando dados anteriores...`);
    const cleared = await clearPreviousData(documentId);
    if (cleared.entities > 0 || cleared.pages > 0) {
      console.log(`   Removidos: ${cleared.entities} entidades, ${cleared.pages} páginas, ${cleared.sections} seções, ${cleared.timeline} eventos, ${cleared.risks} riscos`);
    }
    
    // 1. Baixar PDF do Minio
    console.log(`\n📥 Baixando PDF do storage...`);
    const pdfBuffer = await downloadFile(s3Key);
    console.log(`   ✓ PDF baixado (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    // 2. Extrair texto por página
    console.log(`\n📄 Extraindo texto das páginas...`);
    const pages = await extractPagesFromPDF(pdfBuffer);
    console.log(`   ✓ ${pages.length} página(s) extraída(s)`);
    
    // 3. Criar registros de páginas no banco
    console.log(`\n💾 Criando registros de páginas...`);
    const pageRecords = await pageService.createPages(documentId, pages);
    console.log(`   ✓ ${pageRecords.length} registros criados`);
    
    // 4. Calcular batches
    const processingConfig = {
      ...DEFAULT_PROCESSING_CONFIG,
      wordCap: config.wordCap,
      maxPagesPerBatch: config.maxPagesPerBatch,
    };
    
    const batches = batchService.calculateBatches(pageRecords, processingConfig);
    
    console.log(`\n📦 Batches calculados: ${batches.length}`);
    for (const batch of batches) {
      console.log(`   Batch ${batch.batchNumber}: páginas ${batch.pages.map(p => p.pageNumber).join(', ')} (${batch.totalWords} palavras)`);
    }
    
    // Atualizar documento com info de batches
    await updateDocumentStatus(documentId, 'PROCESSING', {
      totalPages: pages.length,
      totalBatches: batches.length,
      pagesProcessed: 0,
      currentBatch: 0,
    });
    
    // 5. Processar documento com batches
    console.log(`\n🤖 Iniciando análise com IA...`);
    
    const analysisResult = await analyzeDocumentWithBatches(
      documentId,
      batches,
      async (currentBatch, totalBatches) => {
        // Callback de progresso
        await updateDocumentStatus(documentId, 'PROCESSING', {
          currentBatch,
          pagesProcessed: batches
            .slice(0, currentBatch)
            .reduce((sum, b) => sum + b.pages.length, 0),
        });
      }
    );
    
    // 6. Atualizar status final
    const finalStatus: PDFDocument['status'] = analysisResult.success 
      ? 'COMPLETED' 
      : 'FAILED';
    
    await updateDocumentStatus(documentId, finalStatus, {
      processingCompletedAt: new Date(),
      pagesProcessed: pages.length,
      currentBatch: batches.length,
    });
    
    // 7. Gerar embeddings para RAG (se processamento foi bem-sucedido)
    let embeddingsCreated = 0;
    if (analysisResult.success) {
      console.log(`\n🔢 Gerando embeddings para RAG...`);
      try {
        const ragService = getRagService();
        const embeddingResult = await ragService.prepareDocument(documentId);
        embeddingsCreated = embeddingResult.created;
        console.log(`   ✓ ${embeddingsCreated} embeddings criados`);
      } catch (embeddingError) {
        console.error(`   ⚠️  Erro ao gerar embeddings (não crítico):`, embeddingError);
        // Não falha o processamento por erro de embedding
      }
    }
    
    // Log final
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ PROCESSAMENTO CONCLUÍDO`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Status: ${finalStatus}`);
    console.log(`   Páginas: ${pages.length}`);
    console.log(`   Batches: ${analysisResult.totalBatches}`);
    console.log(`   Seções: ${analysisResult.totalSections}`);
    console.log(`   Entidades: ${analysisResult.totalEntities}`);
    console.log(`   Timeline: ${analysisResult.totalTimelineEvents} eventos`);
    console.log(`   Riscos: ${analysisResult.totalRisks}`);
    console.log(`   Embeddings RAG: ${embeddingsCreated}`);
    console.log(`   Tempo total: ${(analysisResult.totalProcessingTimeMs / 1000).toFixed(2)}s`);
    
    if (!analysisResult.success) {
      const failedBatches = analysisResult.batchResults.filter(b => !b.success);
      console.log(`\n⚠️  ${failedBatches.length} batch(es) falharam:`);
      for (const fb of failedBatches) {
        console.log(`   - Batch ${fb.batchNumber}: ${fb.error}`);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ ERRO AO PROCESSAR EDITAL ${documentId}:`, error);
    
    await updateDocumentStatus(documentId, 'FAILED', {
      processingCompletedAt: new Date(),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    
    // Não re-lança o erro para não derrubar a fila
  }
}

/**
 * Obtém estatísticas de um documento processado
 */
export async function getDocumentStats(documentId: string): Promise<{
  document: PDFDocument | null;
  pages: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  structure: {
    totalSections: number;
    byLevel: Record<string, number>;
  };
  entities: {
    total: number;
    byType: Record<string, number>;
  };
  timeline: {
    totalEvents: number;
    byImportance: Record<string, number>;
    upcomingCritical: number;
  };
  risks: {
    total: number;
    bySeverity: Record<string, number>;
    criticalCount: number;
  };
}> {
  const db = getDatabase();
  const pageService = getPageService();
  const structureService = getDocumentStructureService();
  const timelineService = getTimelineService();
  const riskService = getRiskService();
  const unificationService = getEntityUnificationService();

  // Buscar documento
  const document = await db.collection<PDFDocument>('documents').findOne({
    _id: new ObjectId(documentId),
  });

  // Estatísticas de páginas
  const pageStats = await pageService.getProcessingStats(documentId);

  // Estatísticas de estrutura
  const structureStats = await structureService.getStructureStats(documentId);

  // Estatísticas de entidades
  const entities = await unificationService.findByDocumentId(documentId);
  const entityByType: Record<string, number> = {};
  for (const entity of entities) {
    entityByType[entity.type] = (entityByType[entity.type] || 0) + 1;
  }

  // Estatísticas de timeline
  const timelineStats = await timelineService.getTimelineStats(documentId);

  // Estatísticas de riscos
  const riskStats = await riskService.getRiskStats(documentId);

  return {
    document,
    pages: {
      total: pageStats.totalPages,
      completed: pageStats.completedPages,
      failed: pageStats.failedPages,
      pending: pageStats.pendingPages + pageStats.processingPages,
    },
    structure: {
      totalSections: structureStats.totalSections,
      byLevel: structureStats.byLevel,
    },
    entities: {
      total: entities.length,
      byType: entityByType,
    },
    timeline: {
      totalEvents: timelineStats.totalEvents,
      byImportance: timelineStats.byImportance,
      upcomingCritical: timelineStats.upcomingCritical,
    },
    risks: {
      total: riskStats.totalRisks,
      bySeverity: riskStats.bySeverity,
      criticalCount: riskStats.criticalCount,
    },
  };
}
