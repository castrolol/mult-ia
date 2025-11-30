import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';  
import { createTools } from './tools.js';

const SYSTEM_PROMPT = `Você é um assistente especializado em análise de documentos PDF.

Sua tarefa é analisar o texto de cada página e:
1. Identificar informações relevantes e fatos importantes
2. Extrair dados estruturados quando possível
3. Usar a tool "fetchGlobalContext" se precisar de contexto adicional do projeto
4. SEMPRE usar a tool "savePageAnalysis" para salvar sua análise ao final

Seja conciso e objetivo. Foque em extrair informações acionáveis.`;

export interface AnalysisResult {
  text: string;
  toolCalls: number;
  success: boolean;
}

export async function analyzePageWithAI(
  pageText: string,
  documentId: string,
  pageNumber: number
): Promise<AnalysisResult> {
  try {
    const tools = createTools(documentId, pageNumber);

    const { text, steps } = await generateText({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: `Analise o texto da página ${pageNumber} do documento e extraia as informações relevantes.

Texto da página:
---
${pageText}
---

Após sua análise, use a tool "savePageAnalysis" para salvar os resultados.`,
      maxSteps: 5, // Permite até 5 ciclos de tool calls
      tools,
    });

    const toolCallsCount = steps.reduce(
      (acc: number, step: { toolCalls?: unknown[] }) => acc + (step.toolCalls?.length || 0),
      0
    );

    console.log(
      `✓ Página ${pageNumber} analisada. Tool calls: ${toolCallsCount}`
    );

    return {
      text,
      toolCalls: toolCallsCount,
      success: true,
    };
  } catch (error) {
    console.error(`Erro ao analisar página ${pageNumber}:`, error);

    return {
      text: '',
      toolCalls: 0,
      success: false,
    };
  }
}

