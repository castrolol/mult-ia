import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStructureTools, createExtractionTools } from './tools.js';
import {
  STRUCTURE_EXTRACTION_SYSTEM_PROMPT,
  createStructureExtractionPrompt,
} from './prompts/structure-extraction.js';
import {
  ENTITY_EXTRACTION_SYSTEM_PROMPT,
  createBatchExtractionPrompt,
} from './prompts/entity-extraction.js';
import { getDocumentStructureService } from '../services/document-structure.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import { getTimelineService } from '../services/timeline.js';
import { getRiskService } from '../services/risk.js';
import type {
  DocumentPage,
  BatchExtractionResult,
  RawDocumentSection,
  RawExtractedEntity,
  RawTimelineEvent,
  RawRisk,
} from '../types/entities.js';
import type { PageBatch, BatchContext } from '../services/batch-processor.js';

// ============================================================================
// TIPOS
// ============================================================================

export interface BatchAnalysisResult {
  batchNumber: number;
  pagesProcessed: number[];
  
  // Estágio 1
  structureExtracted: boolean;
  sectionsFound: number;
  
  // Estágio 2
  entitiesExtracted: number;
  timelineEventsCreated: number;
  risksIdentified: number;
  
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface DocumentAnalysisResult {
  totalBatches: number;
  batchResults: BatchAnalysisResult[];
  
  // Totais
  totalSections: number;
  totalEntities: number;
  totalTimelineEvents: number;
  totalRisks: number;
  
  // Métricas
  totalProcessingTimeMs: number;
  averageBatchTimeMs: number;
  
  success: boolean;
}

// ============================================================================
// PROCESSAMENTO DE BATCH
// ============================================================================

/**
 * Processa um batch completo (Estágio 1 + Estágio 2)
 */
export async function processBatch(
  batch: PageBatch,
  documentId: string,
  context: BatchContext
): Promise<BatchExtractionResult> {
  const startTime = Date.now();
  const structureService = getDocumentStructureService();
  
  const result: BatchExtractionResult = {
    batchNumber: batch.batchNumber,
    pagesProcessed: batch.pages.map(p => p.pageNumber),
    sections: [],
    entities: [],
    timelineEvents: [],
    risks: [],
  };

  // =========================================================================
  // ESTÁGIO 1: Extração de Estrutura
  // =========================================================================
  
  console.log(`   📁 Estágio 1: Extraindo estrutura...`);
  
  try {
    const structureTools = createStructureTools(documentId, batch.batchNumber);
    
    const structurePrompt = createStructureExtractionPrompt(
      batch.consolidatedText,
      batch.batchNumber,
      context.existingSections
    );

    const { steps: structureSteps } = await generateText({
      model: openai('gpt-5.1'),
      system: STRUCTURE_EXTRACTION_SYSTEM_PROMPT,
      prompt: structurePrompt,
      maxSteps: 3,
      tools: structureTools,
    });

    // Coletar seções criadas
    for (const step of structureSteps) {
      if (step.toolCalls) {
        for (const toolCall of step.toolCalls) {
          if (toolCall.toolName === 'saveSections') {
            const toolResult = step.toolResults?.find(
              r => r.toolCallId === toolCall.toolCallId
            );
            if (toolResult?.result && typeof toolResult.result === 'object') {
              const saveResult = toolResult.result as { sectionsCreated?: number; sectionIds?: Array<{ id: string; number?: string; title: string }> };
              if (saveResult.sectionIds) {
                for (const s of saveResult.sectionIds) {
                  result.sections.push({
                    level: 'SECTION', // Será atualizado depois
                    title: s.title,
                    number: s.number,
                    pageNumber: batch.pages[0]?.pageNumber || 1,
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log(`      ✓ ${result.sections.length} seções identificadas`);

  } catch (error) {
    console.error(`      ✗ Erro no Estágio 1:`, error);
    // Continuar para o Estágio 2 mesmo se a estrutura falhar
  }

  // =========================================================================
  // ESTÁGIO 2: Extração de Entidades, Timeline e Riscos
  // =========================================================================
  
  console.log(`   📊 Estágio 2: Extraindo entidades...`);
  
  try {
    // Buscar seções atuais para vincular entidades
    const allSections = await structureService.getSectionsByDocumentId(documentId);
    const sectionsList = allSections.map(s => ({
      id: s.id,
      number: s.number,
      title: s.title,
      level: s.level,
    }));

    const extractionTools = createExtractionTools(
      documentId,
      batch.batchNumber,
      batch.pages.map(p => p.pageNumber)
    );

    const extractionPrompt = createBatchExtractionPrompt(
      batch.consolidatedText,
      batch.batchNumber,
      sectionsList,
      {
        semanticKeys: context.existingSemanticKeys,
        entitySummary: context.entitySummary,
        timelineEventKeys: context.timelineEventKeys,
      }
    );

    const { steps: extractionSteps } = await generateText({
      model: openai('gpt-5.1'),
      system: ENTITY_EXTRACTION_SYSTEM_PROMPT,
      prompt: extractionPrompt,
      maxSteps: 5,
      tools: extractionTools,
    });

    // Coletar resultados
    for (const step of extractionSteps) {
      if (step.toolCalls) {
        for (const toolCall of step.toolCalls) {
          if (toolCall.toolName === 'saveExtractionResults') {
            const toolResult = step.toolResults?.find(
              r => r.toolCallId === toolCall.toolCallId
            );
            if (toolResult?.result && typeof toolResult.result === 'object') {
              const saveResult = toolResult.result as {
                entitiesCreated?: number;
                timelineEventsCreated?: number;
                risksCreated?: number;
              };
              
              // Criar placeholders para contagem (os dados reais já foram salvos)
              if (saveResult.entitiesCreated) {
                for (let i = 0; i < saveResult.entitiesCreated; i++) {
                  result.entities.push({
                    type: 'OUTRO',
                    name: '',
                    rawValue: '',
                    semanticKey: `placeholder-${i}`,
                    metadata: {},
                    confidence: 0,
                    pageNumber: batch.pages[0]?.pageNumber || 1,
                    pageId: '',
                    excerptText: '',
                  });
                }
              }
              
              if (saveResult.timelineEventsCreated) {
                for (let i = 0; i < saveResult.timelineEventsCreated; i++) {
                  result.timelineEvents.push({
                    dateRaw: '',
                    dateType: 'FIXED',
                    eventType: '',
                    title: '',
                    description: '',
                    importance: 'MEDIUM',
                    tags: [],
                    sourceSemanticKey: `placeholder-${i}`,
                    pageNumber: batch.pages[0]?.pageNumber || 1,
                    excerpt: '',
                    confidence: 0,
                  });
                }
              }
              
              if (saveResult.risksCreated) {
                for (let i = 0; i < saveResult.risksCreated; i++) {
                  result.risks.push({
                    category: '',
                    title: '',
                    description: '',
                    trigger: '',
                    consequence: '',
                    severity: 'MEDIUM',
                    probability: 'POSSIBLE',
                    pageNumber: batch.pages[0]?.pageNumber || 1,
                    excerpt: '',
                    confidence: 0,
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log(`      ✓ ${result.entities.length} entidades, ${result.timelineEvents.length} timeline, ${result.risks.length} riscos`);

  } catch (error) {
    console.error(`      ✗ Erro no Estágio 2:`, error);
    throw error;
  }

  const processingTimeMs = Date.now() - startTime;
  console.log(`   ⏱️  Batch ${batch.batchNumber} concluído em ${processingTimeMs}ms`);

  return result;
}

/**
 * Cria um processador de batch compatível com BatchProcessorService
 */
export function createBatchProcessor(documentId: string) {
  return async (batch: PageBatch, context: BatchContext): Promise<BatchExtractionResult> => {
    return processBatch(batch, documentId, context);
  };
}

// ============================================================================
// ANÁLISE COMPLETA DE DOCUMENTO
// ============================================================================

/**
 * Analisa um documento completo usando o sistema de batches
 * Esta função é chamada pelo pdf-processor após calcular os batches
 */
export async function analyzeDocumentWithBatches(
  documentId: string,
  batches: PageBatch[],
  onProgress?: (batch: number, total: number) => void
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now();
  
  const result: DocumentAnalysisResult = {
    totalBatches: batches.length,
    batchResults: [],
    totalSections: 0,
    totalEntities: 0,
    totalTimelineEvents: 0,
    totalRisks: 0,
    totalProcessingTimeMs: 0,
    averageBatchTimeMs: 0,
    success: true,
  };

  // Contexto acumulado entre batches
  const context: BatchContext = {
    existingSemanticKeys: [],
    existingSections: [],
    entitySummary: [],
    timelineEventKeys: [],
    riskIds: [],
  };

  // Processar cada batch
  for (const batch of batches) {
    console.log(`\n🔄 Processando Batch ${batch.batchNumber}/${batches.length}...`);
    
    if (onProgress) {
      onProgress(batch.batchNumber, batches.length);
    }

    const batchStartTime = Date.now();

    try {
      const batchResult = await processBatch(batch, documentId, context);
      
      const processingTimeMs = Date.now() - batchStartTime;

      // Atualizar contexto
      updateContext(context, batchResult);

      // Agregar resultado
      result.batchResults.push({
        batchNumber: batch.batchNumber,
        pagesProcessed: batchResult.pagesProcessed,
        structureExtracted: batchResult.sections.length > 0,
        sectionsFound: batchResult.sections.length,
        entitiesExtracted: batchResult.entities.length,
        timelineEventsCreated: batchResult.timelineEvents.length,
        risksIdentified: batchResult.risks.length,
        processingTimeMs,
        success: true,
      });

      result.totalSections += batchResult.sections.length;
      result.totalEntities += batchResult.entities.length;
      result.totalTimelineEvents += batchResult.timelineEvents.length;
      result.totalRisks += batchResult.risks.length;

    } catch (error) {
      const processingTimeMs = Date.now() - batchStartTime;
      
      console.error(`❌ Erro no Batch ${batch.batchNumber}:`, error);

      result.batchResults.push({
        batchNumber: batch.batchNumber,
        pagesProcessed: batch.pages.map(p => p.pageNumber),
        structureExtracted: false,
        sectionsFound: 0,
        entitiesExtracted: 0,
        timelineEventsCreated: 0,
        risksIdentified: 0,
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });

      result.success = false;
    }
  }

  // Pós-processamento: Consolidar timeline
  await consolidateTimeline(documentId);

  // Calcular métricas finais
  result.totalProcessingTimeMs = Date.now() - startTime;
  
  const successfulBatches = result.batchResults.filter(b => b.success);
  if (successfulBatches.length > 0) {
    const totalBatchTime = successfulBatches.reduce((sum, b) => sum + b.processingTimeMs, 0);
    result.averageBatchTimeMs = Math.round(totalBatchTime / successfulBatches.length);
  }

  // Log final
  console.log(`\n📊 Análise do documento concluída:`);
  console.log(`   Batches processados: ${successfulBatches.length}/${batches.length}`);
  console.log(`   Seções: ${result.totalSections}`);
  console.log(`   Entidades: ${result.totalEntities}`);
  console.log(`   Timeline: ${result.totalTimelineEvents} eventos`);
  console.log(`   Riscos: ${result.totalRisks}`);
  console.log(`   Tempo total: ${result.totalProcessingTimeMs}ms`);

  return result;
}

/**
 * Atualiza o contexto com os resultados de um batch
 */
function updateContext(context: BatchContext, result: BatchExtractionResult): void {
  // Adicionar seções
  for (const section of result.sections) {
    context.existingSections.push({
      number: section.number,
      title: section.title,
      level: section.level,
    });
  }

  // Adicionar entidades
  for (const entity of result.entities) {
    if (!context.existingSemanticKeys.includes(entity.semanticKey)) {
      context.existingSemanticKeys.push(entity.semanticKey);
      context.entitySummary.push({
        type: entity.type,
        semanticKey: entity.semanticKey,
        name: entity.name,
      });
    }
  }

  // Adicionar timeline
  for (const event of result.timelineEvents) {
    if (!context.timelineEventKeys.includes(event.sourceSemanticKey)) {
      context.timelineEventKeys.push(event.sourceSemanticKey);
    }
  }

  // Adicionar riscos
  for (const risk of result.risks) {
    const riskId = `${risk.category}:${risk.title}`;
    if (!context.riskIds.includes(riskId)) {
      context.riskIds.push(riskId);
    }
  }
}

/**
 * Pós-processamento: Consolida o timeline recalculando urgências
 */
async function consolidateTimeline(documentId: string): Promise<void> {
  console.log(`\n🔄 Consolidando timeline...`);
  
  const timelineService = getTimelineService();
  
  // Recalcular dias até deadline para todos os eventos
  await timelineService.recalculateDeadlines(documentId);
  
  // Obter estatísticas
  const stats = await timelineService.getTimelineStats(documentId);
  
  console.log(`   ✓ ${stats.totalEvents} eventos consolidados`);
  console.log(`   ✓ ${stats.upcomingCritical} eventos críticos próximos`);
  console.log(`   ✓ ${stats.withPenalties} eventos com penalidades`);
}

// ============================================================================
// FUNÇÕES LEGADAS (compatibilidade)
// ============================================================================

/**
 * @deprecated Use analyzeDocumentWithBatches
 */
export async function analyzeDocumentWithAI(
  pages: Array<{ pageNumber: number; text: string }>,
  documentId: string,
  _concurrency: number = 10
): Promise<{
  totalPages: number;
  pagesAnalyzed: number;
  totalEntities: number;
  entitiesByType: Record<string, number>;
  conflictsResolved: number;
  success: boolean;
  pageResults: Array<{
    pageId: string;
    pageNumber: number;
    processingTimeMs: number;
    entitiesExtracted: number;
    success: boolean;
  }>;
  totalProcessingTimeMs: number;
  averagePageTimeMs: number;
}> {
  // Converter para formato de batch
  const { getBatchProcessorService } = await import('../services/batch-processor.js');
  const { getPageService } = await import('../services/page.js');
  
  const batchService = getBatchProcessorService();
  const pageService = getPageService();
  
  // Criar páginas no banco
  const pageRecords = await pageService.createPages(documentId, pages);
  
  // Calcular batches com config padrão
  const config = { wordCap: 5000, maxPagesPerBatch: 10, concurrency: 5, retryAttempts: 2 };
  const batches = batchService.calculateBatches(pageRecords, config);
  
  // Processar
  const result = await analyzeDocumentWithBatches(documentId, batches);
  
  // Obter entidades para estatísticas
  const unificationService = getEntityUnificationService();
  const entities = await unificationService.findByDocumentId(documentId);
  
  const entitiesByType: Record<string, number> = {};
  for (const entity of entities) {
    entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
  }
  
  return {
    totalPages: pages.length,
    pagesAnalyzed: result.batchResults.reduce((sum, b) => sum + b.pagesProcessed.length, 0),
    totalEntities: result.totalEntities,
    entitiesByType,
    conflictsResolved: 0,
    success: result.success,
    pageResults: result.batchResults.flatMap(b => 
      b.pagesProcessed.map((pn, idx) => ({
        pageId: `batch-${b.batchNumber}-page-${idx}`,
        pageNumber: pn,
        processingTimeMs: b.processingTimeMs / b.pagesProcessed.length,
        entitiesExtracted: b.entitiesExtracted / b.pagesProcessed.length,
        success: b.success,
      }))
    ),
    totalProcessingTimeMs: result.totalProcessingTimeMs,
    averagePageTimeMs: result.averageBatchTimeMs / 5, // Aproximação
  };
}
