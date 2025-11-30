import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createTools } from './tools.js';
import {
  ENTITY_EXTRACTION_SYSTEM_PROMPT,
  createPageAnalysisPrompt
} from './prompts/entity-extraction.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import { getPageService } from '../services/page.js';
import type { DocumentPage } from '../types/entities.js';
import { createDateExtractionPrompt, DATE_EXTRACTION_SYSTEM_PROMPT } from './prompts/date-extraction.js';

export interface AnalysisResult {
  text: string;
  toolCalls: number;
  entitiesExtracted: number;
  success: boolean;
  pageId: string;
  processingTimeMs: number;
}

export interface PageResult {
  pageId: string;
  pageNumber: number;
  processingTimeMs: number;
  entitiesExtracted: number;
  success: boolean;
  error?: string;
}

export interface DocumentAnalysisResult {
  totalPages: number;
  pagesAnalyzed: number;
  totalEntities: number;
  entitiesByType: Record<string, number>;
  conflictsResolved: number;
  success: boolean;
  pageResults: PageResult[];
  totalProcessingTimeMs: number;
  averagePageTimeMs: number;
}

/**
 * Analisa uma página do edital e extrai entidades
 */
export async function analyzePageWithAI(
  pageText: string,
  documentId: string,
  pageNumber: number,
  pageId: string,
  existingSemanticKeys?: string[]
): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    const tools = createTools(documentId, pageNumber, pageId);

    // Criar prompt com contexto de entidades já extraídas
    const prompt =  createPageAnalysisPrompt(
      pageText,
      pageNumber,
      existingSemanticKeys
    );

    const { text, steps } = await generateText({
      model: openai('gpt-5.1'),
      system:  ENTITY_EXTRACTION_SYSTEM_PROMPT,
      prompt,
      maxSteps: 5,
      tools,
    });

    // Contar tool calls e entidades extraídas
    let toolCallsCount = 0;
    let entitiesExtracted = 0;

    for (const step of steps) {
      if (step.toolCalls) {
        toolCallsCount += step.toolCalls.length;

        // Contar entidades dos resultados de saveEntities
        for (const toolCall of step.toolCalls) {
          if (toolCall.toolName === 'saveEntities') {
            const result = step.toolResults?.find(
              (r) => r.toolCallId === toolCall.toolCallId
            );
            if (result?.result && typeof result.result === 'object') {
              const saveResult = result.result as { totalEntities?: number };
              entitiesExtracted += saveResult.totalEntities || 0;
            }
          }
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `   ✓ Página ${pageNumber}: ${entitiesExtracted} entidades, ${toolCallsCount} tool calls (${processingTimeMs}ms)`
    );

    return {
      text,
      toolCalls: toolCallsCount,
      entitiesExtracted,
      success: true,
      pageId,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`Erro ao analisar página ${pageNumber}:`, error);

    return {
      text: '',
      toolCalls: 0,
      entitiesExtracted: 0,
      success: false,
      pageId,
      processingTimeMs,
    };
  }
}

/**
 * Processa um batch de páginas em paralelo
 */
async function processBatch(
  batch: DocumentPage[],
  documentId: string,
  existingSemanticKeys: string[]
): Promise<PageResult[]> {
  const pageService = getPageService();

  const results = await Promise.all(
    batch.map(async (pageRecord): Promise<PageResult> => {
      // Marcar página como em processamento
      await pageService.markAsProcessing(pageRecord.id);

      // Verificar se a página está vazia
      if (!pageRecord.text.trim()) {
        console.log(`   ⚠ Página ${pageRecord.pageNumber} vazia, pulando...`);
        await pageService.markAsCompleted(pageRecord.id, 0, 0);
        return {
          pageId: pageRecord.id,
          pageNumber: pageRecord.pageNumber,
          processingTimeMs: 0,
          entitiesExtracted: 0,
          success: true,
        };
      }

      // Processar a página
      const result = await analyzePageWithAI(
        pageRecord.text,
        documentId,
        pageRecord.pageNumber,
        pageRecord.id,
        existingSemanticKeys
      );

      // Atualizar status da página no banco
      if (result.success) {
        await pageService.markAsCompleted(
          pageRecord.id,
          result.processingTimeMs,
          result.entitiesExtracted
        );
      } else {
        await pageService.markAsFailed(
          pageRecord.id,
          'Erro durante processamento',
          result.processingTimeMs
        );
      }

      return {
        pageId: pageRecord.id,
        pageNumber: pageRecord.pageNumber,
        processingTimeMs: result.processingTimeMs,
        entitiesExtracted: result.entitiesExtracted,
        success: result.success,
      };
    })
  );

  return results;
}

/**
 * Analisa um documento completo com processamento paralelo
 * Processa páginas em batches para otimizar performance
 * 
 * @param pages - Array de páginas do documento
 * @param documentId - ID do documento
 * @param concurrency - Número de páginas processadas simultaneamente (default: 5)
 */
export async function analyzeDocumentWithAI(
  pages: Array<{ pageNumber: number; text: string }>,
  documentId: string,
  concurrency: number = 10
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now();
  const unificationService = getEntityUnificationService();
  const pageService = getPageService();

  const result: DocumentAnalysisResult = {
    totalPages: pages.length,
    pagesAnalyzed: 0,
    totalEntities: 0,
    entitiesByType: {},
    conflictsResolved: 0,
    success: true,
    pageResults: [],
    totalProcessingTimeMs: 0,
    averagePageTimeMs: 0,
  };

  // Criar registros de páginas no banco
  console.log(`\n📄 Criando registros para ${pages.length} páginas...`);
  const pageRecords = await pageService.createPages(documentId, pages);

  // Processar páginas em batches
  console.log(`\n🔄 Processando páginas com concorrência de ${concurrency}...`);

  for (let i = 0; i < pageRecords.length; i += concurrency) {
    const batch = pageRecords.slice(i, i + concurrency);
    const batchStart = i + 1;
    const batchEnd = Math.min(i + concurrency, pageRecords.length);

    console.log(`\n📦 Batch ${Math.floor(i / concurrency) + 1}: páginas ${batchStart}-${batchEnd}`);

    // Obter semantic keys já extraídas para contexto (antes de cada batch)
    const existingKeys = await unificationService.getExistingSemanticKeys(documentId);

    // Processar batch em paralelo
    const batchResults = await processBatch(batch, documentId, existingKeys);

    // Agregar resultados
    for (const pageResult of batchResults) {
      result.pageResults.push(pageResult);

      if (pageResult.success) {
        result.pagesAnalyzed++;
        result.totalEntities += pageResult.entitiesExtracted;
      } else {
        result.success = false;
      }
    }
  }

  // Calcular métricas de tempo
  result.totalProcessingTimeMs = Date.now() - startTime;

  const successfulPages = result.pageResults.filter(p => p.success && p.processingTimeMs > 0);
  if (successfulPages.length > 0) {
    const totalPageTime = successfulPages.reduce((sum, p) => sum + p.processingTimeMs, 0);
    result.averagePageTimeMs = Math.round(totalPageTime / successfulPages.length);
  }

  // Obter estatísticas finais de entidades
  const entities = await unificationService.findByDocumentId(documentId);

  for (const entity of entities) {
    result.entitiesByType[entity.type] = (result.entitiesByType[entity.type] || 0) + 1;
  }

  result.totalEntities = entities.length;

  // Log do resumo
  console.log(`\n📊 Resumo da análise:`);
  console.log(`   Páginas analisadas: ${result.pagesAnalyzed}/${result.totalPages}`);
  console.log(`   Total de entidades: ${result.totalEntities}`);
  console.log(`   Por tipo:`, result.entitiesByType);
  console.log(`\n⏱️  Métricas de tempo:`);
  console.log(`   Tempo total: ${result.totalProcessingTimeMs}ms`);
  console.log(`   Tempo médio por página: ${result.averagePageTimeMs}ms`);
  console.log(`   Concorrência: ${concurrency} páginas simultâneas`);

  return result;
}
