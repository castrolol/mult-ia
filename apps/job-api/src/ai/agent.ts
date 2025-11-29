import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createTools } from './tools.js';
import { 
  ENTITY_EXTRACTION_SYSTEM_PROMPT, 
  createPageAnalysisPrompt 
} from './prompts/entity-extraction.js';
import { getEntityUnificationService } from '../services/entity-unification.js';

export interface AnalysisResult {
  text: string;
  toolCalls: number;
  entitiesExtracted: number;
  success: boolean;
}

export interface DocumentAnalysisResult {
  totalPages: number;
  pagesAnalyzed: number;
  totalEntities: number;
  entitiesByType: Record<string, number>;
  conflictsResolved: number;
  success: boolean;
}

/**
 * Analisa uma página do edital e extrai entidades
 */
export async function analyzePageWithAI(
  pageText: string,
  documentId: string,
  pageNumber: number,
  existingSemanticKeys?: string[]
): Promise<AnalysisResult> {
  try {
    const tools = createTools(documentId, pageNumber);
    
    // Criar prompt com contexto de entidades já extraídas
    const prompt = createPageAnalysisPrompt(
      pageText, 
      pageNumber, 
      existingSemanticKeys
    );

    const { text, steps } = await generateText({
      model: openai('gpt-4o-mini'),
      system: ENTITY_EXTRACTION_SYSTEM_PROMPT,
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

    console.log(
      `   ✓ Página ${pageNumber}: ${entitiesExtracted} entidades, ${toolCallsCount} tool calls`
    );

    return {
      text,
      toolCalls: toolCallsCount,
      entitiesExtracted,
      success: true,
    };
  } catch (error) {
    console.error(`Erro ao analisar página ${pageNumber}:`, error);

    return {
      text: '',
      toolCalls: 0,
      entitiesExtracted: 0,
      success: false,
    };
  }
}

/**
 * Analisa um documento completo, página por página
 * Mantém contexto de entidades já extraídas para evitar duplicatas
 */
export async function analyzeDocumentWithAI(
  pages: Array<{ pageNumber: number; text: string }>,
  documentId: string
): Promise<DocumentAnalysisResult> {
  const unificationService = getEntityUnificationService();
  
  const result: DocumentAnalysisResult = {
    totalPages: pages.length,
    pagesAnalyzed: 0,
    totalEntities: 0,
    entitiesByType: {},
    conflictsResolved: 0,
    success: true,
  };

  // Processar cada página
  for (const page of pages) {
    if (!page.text.trim()) {
      console.log(`   ⚠ Página ${page.pageNumber} vazia, pulando...`);
      continue;
    }

    // Obter semantic keys já extraídas para contexto
    const existingKeys = await unificationService.getExistingSemanticKeys(documentId);

    const pageResult = await analyzePageWithAI(
      page.text,
      documentId,
      page.pageNumber,
      existingKeys
    );

    if (pageResult.success) {
      result.pagesAnalyzed++;
      result.totalEntities += pageResult.entitiesExtracted;
    } else {
      result.success = false;
    }
  }

  // Obter estatísticas finais
  const entities = await unificationService.findByDocumentId(documentId);
  
  for (const entity of entities) {
    result.entitiesByType[entity.type] = (result.entitiesByType[entity.type] || 0) + 1;
  }

  result.totalEntities = entities.length;

  console.log(`\n📊 Resumo da análise:`);
  console.log(`   Páginas analisadas: ${result.pagesAnalyzed}/${result.totalPages}`);
  console.log(`   Total de entidades: ${result.totalEntities}`);
  console.log(`   Por tipo:`, result.entitiesByType);

  return result;
}
