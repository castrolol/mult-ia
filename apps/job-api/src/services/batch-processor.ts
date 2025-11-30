import { getDatabase } from './database.js';
import { getPageService } from './page.js';
import type {
  DocumentPage,
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG,
  BatchExtractionResult,
} from '../types/entities.js';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Batch de páginas para processamento
 */
export interface PageBatch {
  /** Número do batch (1-indexed) */
  batchNumber: number;
  
  /** Páginas incluídas no batch */
  pages: DocumentPage[];
  
  /** Total de palavras no batch */
  totalWords: number;
  
  /** Texto consolidado do batch */
  consolidatedText: string;
}

/**
 * Resultado do processamento de um batch
 */
export interface BatchProcessingResult {
  batchNumber: number;
  pagesProcessed: number[];
  success: boolean;
  error?: string;
  processingTimeMs: number;
  
  /** Contadores */
  sectionsExtracted: number;
  entitiesExtracted: number;
  timelineEventsCreated: number;
  risksIdentified: number;
}

/**
 * Contexto acumulado entre batches
 */
export interface BatchContext {
  /** Semantic keys já extraídas */
  existingSemanticKeys: string[];
  
  /** Seções já identificadas (para hierarquia) */
  existingSections: Array<{
    number?: string;
    title: string;
    level: string;
  }>;
  
  /** Resumo das entidades extraídas (para referência) */
  entitySummary: Array<{
    type: string;
    semanticKey: string;
    name: string;
  }>;
  
  /** Eventos do timeline já criados */
  timelineEventKeys: string[];
  
  /** IDs de riscos já identificados */
  riskIds: string[];
}

/**
 * Callback para processar um batch
 */
export type BatchProcessor = (
  batch: PageBatch,
  context: BatchContext
) => Promise<BatchExtractionResult>;

// ============================================================================
// SERVIÇO DE PROCESSAMENTO EM BATCHES
// ============================================================================

/**
 * Serviço para processamento de documentos em batches
 * Responsável por dividir o documento em batches e coordenar o processamento
 */
export class BatchProcessorService {
  private db = getDatabase();
  private pageService = getPageService();
  
  /**
   * Conta palavras em um texto
   */
  countWords(text: string): number {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }
  
  /**
   * Calcula os batches para um documento baseado no wordCap
   * Não quebra páginas ao meio - se adicionar uma página ultrapassar o cap,
   * ela vai para o próximo batch
   */
  calculateBatches(
    pages: DocumentPage[],
    config: ProcessingConfig
  ): PageBatch[] {
    const batches: PageBatch[] = [];
    let currentBatch: DocumentPage[] = [];
    let currentWordCount = 0;
    let batchNumber = 1;
    
    for (const page of pages) {
      const pageWords = page.wordCount || this.countWords(page.text);
      
      // Se adicionar esta página ultrapassa o cap E já temos páginas no batch
      if (currentWordCount + pageWords > config.wordCap && currentBatch.length > 0) {
        // Finaliza o batch atual
        batches.push(this.createBatch(currentBatch, batchNumber, currentWordCount));
        batchNumber++;
        
        // Inicia novo batch com esta página
        currentBatch = [page];
        currentWordCount = pageWords;
      } 
      // Se a página sozinha já é maior que o cap, coloca ela em um batch próprio
      else if (pageWords > config.wordCap && currentBatch.length === 0) {
        currentBatch.push(page);
        currentWordCount = pageWords;
        batches.push(this.createBatch(currentBatch, batchNumber, currentWordCount));
        batchNumber++;
        currentBatch = [];
        currentWordCount = 0;
      }
      // Adiciona ao batch atual
      else {
        currentBatch.push(page);
        currentWordCount += pageWords;
      }
      
      // Também verifica limite de páginas por batch
      if (currentBatch.length >= config.maxPagesPerBatch) {
        batches.push(this.createBatch(currentBatch, batchNumber, currentWordCount));
        batchNumber++;
        currentBatch = [];
        currentWordCount = 0;
      }
    }
    
    // Batch final se houver páginas restantes
    if (currentBatch.length > 0) {
      batches.push(this.createBatch(currentBatch, batchNumber, currentWordCount));
    }
    
    return batches;
  }
  
  /**
   * Cria um objeto PageBatch com texto consolidado
   */
  private createBatch(
    pages: DocumentPage[],
    batchNumber: number,
    totalWords: number
  ): PageBatch {
    // Monta texto consolidado no formato especificado
    const consolidatedText = pages
      .map(p => `Página ${p.pageNumber}:\n${p.text}`)
      .join('\n\n---\n\n');
    
    return {
      batchNumber,
      pages,
      totalWords,
      consolidatedText,
    };
  }
  
  /**
   * Processa um documento completo em batches
   * @param documentId - ID do documento
   * @param pages - Páginas do documento
   * @param config - Configuração de processamento
   * @param processor - Função que processa cada batch
   */
  async processDocument(
    documentId: string,
    pages: DocumentPage[],
    config: ProcessingConfig,
    processor: BatchProcessor
  ): Promise<{
    success: boolean;
    totalBatches: number;
    batchResults: BatchProcessingResult[];
    totalProcessingTimeMs: number;
    aggregatedResult: {
      sectionsExtracted: number;
      entitiesExtracted: number;
      timelineEventsCreated: number;
      risksIdentified: number;
    };
  }> {
    const startTime = Date.now();
    
    // Calcular batches
    const batches = this.calculateBatches(pages, config);
    console.log(`\n📦 Documento dividido em ${batches.length} batch(es)`);
    
    for (const batch of batches) {
      console.log(`   Batch ${batch.batchNumber}: ${batch.pages.length} páginas, ${batch.totalWords} palavras`);
    }
    
    // Contexto acumulado entre batches
    const context: BatchContext = {
      existingSemanticKeys: [],
      existingSections: [],
      entitySummary: [],
      timelineEventKeys: [],
      riskIds: [],
    };
    
    const batchResults: BatchProcessingResult[] = [];
    let overallSuccess = true;
    
    // Processar cada batch sequencialmente
    for (const batch of batches) {
      console.log(`\n🔄 Processando Batch ${batch.batchNumber}/${batches.length}...`);
      
      const batchStartTime = Date.now();
      
      try {
        // Marcar páginas como em processamento
        for (const page of batch.pages) {
          await this.pageService.markAsProcessing(page.id);
          await this.pageService.updateBatchNumber(page.id, batch.batchNumber);
        }
        
        // Processar o batch
        const extractionResult = await processor(batch, context);
        
        const processingTimeMs = Date.now() - batchStartTime;
        
        // Atualizar contexto com resultados
        this.updateContext(context, extractionResult);
        
        // Marcar páginas como concluídas
        for (const page of batch.pages) {
          await this.pageService.markAsCompleted(
            page.id,
            processingTimeMs / batch.pages.length,
            extractionResult.entities.length / batch.pages.length
          );
        }
        
        const result: BatchProcessingResult = {
          batchNumber: batch.batchNumber,
          pagesProcessed: batch.pages.map(p => p.pageNumber),
          success: true,
          processingTimeMs,
          sectionsExtracted: extractionResult.sections.length,
          entitiesExtracted: extractionResult.entities.length,
          timelineEventsCreated: extractionResult.timelineEvents.length,
          risksIdentified: extractionResult.risks.length,
        };
        
        batchResults.push(result);
        
        console.log(`   ✅ Batch ${batch.batchNumber} concluído em ${processingTimeMs}ms`);
        console.log(`      - ${result.sectionsExtracted} seções`);
        console.log(`      - ${result.entitiesExtracted} entidades`);
        console.log(`      - ${result.timelineEventsCreated} eventos timeline`);
        console.log(`      - ${result.risksIdentified} riscos`);
        
      } catch (error) {
        const processingTimeMs = Date.now() - batchStartTime;
        
        console.error(`   ❌ Erro no Batch ${batch.batchNumber}:`, error);
        
        // Marcar páginas como falha
        for (const page of batch.pages) {
          await this.pageService.markAsFailed(
            page.id,
            error instanceof Error ? error.message : 'Erro desconhecido',
            processingTimeMs / batch.pages.length
          );
        }
        
        batchResults.push({
          batchNumber: batch.batchNumber,
          pagesProcessed: batch.pages.map(p => p.pageNumber),
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          processingTimeMs,
          sectionsExtracted: 0,
          entitiesExtracted: 0,
          timelineEventsCreated: 0,
          risksIdentified: 0,
        });
        
        overallSuccess = false;
      }
    }
    
    const totalProcessingTimeMs = Date.now() - startTime;
    
    // Agregar resultados
    const aggregatedResult = batchResults.reduce(
      (acc, r) => ({
        sectionsExtracted: acc.sectionsExtracted + r.sectionsExtracted,
        entitiesExtracted: acc.entitiesExtracted + r.entitiesExtracted,
        timelineEventsCreated: acc.timelineEventsCreated + r.timelineEventsCreated,
        risksIdentified: acc.risksIdentified + r.risksIdentified,
      }),
      {
        sectionsExtracted: 0,
        entitiesExtracted: 0,
        timelineEventsCreated: 0,
        risksIdentified: 0,
      }
    );
    
    console.log(`\n📊 Processamento concluído em ${totalProcessingTimeMs}ms`);
    console.log(`   Total: ${aggregatedResult.sectionsExtracted} seções, ${aggregatedResult.entitiesExtracted} entidades, ${aggregatedResult.timelineEventsCreated} eventos, ${aggregatedResult.risksIdentified} riscos`);
    
    return {
      success: overallSuccess,
      totalBatches: batches.length,
      batchResults,
      totalProcessingTimeMs,
      aggregatedResult,
    };
  }
  
  /**
   * Atualiza o contexto com os resultados de um batch
   */
  private updateContext(
    context: BatchContext,
    result: BatchExtractionResult
  ): void {
    // Adicionar semantic keys das entidades
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
    
    // Adicionar seções
    for (const section of result.sections) {
      context.existingSections.push({
        number: section.number,
        title: section.title,
        level: section.level,
      });
    }
    
    // Adicionar eventos do timeline
    for (const event of result.timelineEvents) {
      if (!context.timelineEventKeys.includes(event.sourceSemanticKey)) {
        context.timelineEventKeys.push(event.sourceSemanticKey);
      }
    }
    
    // Adicionar riscos (usando category + title como identificador)
    for (const risk of result.risks) {
      const riskId = `${risk.category}:${risk.title}`;
      if (!context.riskIds.includes(riskId)) {
        context.riskIds.push(riskId);
      }
    }
  }
  
  /**
   * Gera texto de contexto para passar ao prompt da IA
   */
  generateContextPrompt(context: BatchContext): string {
    const parts: string[] = [];
    
    if (context.existingSemanticKeys.length > 0) {
      parts.push(`## ENTIDADES JÁ EXTRAÍDAS (${context.existingSemanticKeys.length} total)
Use as mesmas semanticKeys para entidades relacionadas. NÃO repita entidades já extraídas.

${context.entitySummary.slice(0, 50).map(e => `- [${e.type}] ${e.semanticKey}: ${e.name}`).join('\n')}
${context.entitySummary.length > 50 ? `\n... e mais ${context.entitySummary.length - 50} entidades` : ''}`);
    }
    
    if (context.existingSections.length > 0) {
      parts.push(`## ESTRUTURA DO DOCUMENTO JÁ IDENTIFICADA
${context.existingSections.map(s => `- [${s.level}] ${s.number || ''} ${s.title}`).join('\n')}`);
    }
    
    if (context.timelineEventKeys.length > 0) {
      parts.push(`## EVENTOS DO TIMELINE JÁ CRIADOS (${context.timelineEventKeys.length} total)
NÃO crie eventos duplicados para estas datas/prazos.`);
    }
    
    return parts.join('\n\n');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: BatchProcessorService | null = null;

export function getBatchProcessorService(): BatchProcessorService {
  if (!serviceInstance) {
    serviceInstance = new BatchProcessorService();
  }
  return serviceInstance;
}

