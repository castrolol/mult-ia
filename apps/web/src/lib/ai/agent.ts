import { generateObject, generateText, tool } from 'ai'
import { z } from 'zod'
import { google, DEFAULT_MODEL, SYSTEM_PROMPTS } from './config'
import {
  documentAnalysisSchema,
  entitySchema,
  deadlineSchema,
  riskFactorSchema,
  type DocumentAnalysisSchemaType,
} from './schemas'

// ============================================
// Document Analysis Agent
// ============================================

export interface AnalysisResult {
  success: boolean
  analysis?: DocumentAnalysisSchemaType
  processingTime: number
  error?: string
}

export async function analyzeDocument(
  content: string,
  documentId: string,
): Promise<AnalysisResult> {
  const startTime = Date.now()

  try {
    const { object: analysis } = await generateObject({
      model: google(DEFAULT_MODEL),
      schema: documentAnalysisSchema,
      system: SYSTEM_PROMPTS.documentAnalysis,
      prompt: `Analise o seguinte documento e extraia todas as informações relevantes.

Documento ID: ${documentId}

Conteúdo:
---
${content}
---

Extraia:
1. Um resumo executivo
2. Todas as entidades (prazos, regras, riscos, multas, requisitos, certidões, documentos obrigatórios)
3. Timeline de prazos críticos com datas específicas
4. Avaliação de riscos

Para cada prazo identificado, mapeie claramente:
- Requisitos → Prazos → Consequências (multas)

Gere IDs únicos para cada item (use formato: tipo-timestamp-random, ex: deadline-1701234567-abc)`,
    })

    return {
      success: true,
      analysis,
      processingTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Error analyzing document:', error)
    return {
      success: false,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Page-by-Page Analysis Agent
// ============================================

export interface PageAnalysisResult {
  success: boolean
  pageNumber: number
  entities: z.infer<typeof entitySchema>[]
  deadlines: z.infer<typeof deadlineSchema>[]
  risks: z.infer<typeof riskFactorSchema>[]
  summary: string
  processingTime: number
  error?: string
}

export async function analyzePageContent(
  pageText: string,
  documentId: string,
  pageNumber: number,
): Promise<PageAnalysisResult> {
  const startTime = Date.now()

  try {
    const { object } = await generateObject({
      model: google(DEFAULT_MODEL),
      schema: z.object({
        summary: z.string(),
        entities: z.array(entitySchema),
        deadlines: z.array(deadlineSchema),
        risks: z.array(riskFactorSchema),
      }),
      system: SYSTEM_PROMPTS.entityExtraction,
      prompt: `Analise a página ${pageNumber} do documento ${documentId}.

Texto da página:
---
${pageText}
---

Extraia todas as entidades, prazos e riscos encontrados nesta página.
Gere IDs únicos no formato: tipo-page${pageNumber}-index (ex: deadline-page1-0)`,
    })

    return {
      success: true,
      pageNumber,
      ...object,
      processingTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error(`Error analyzing page ${pageNumber}:`, error)
    return {
      success: false,
      pageNumber,
      entities: [],
      deadlines: [],
      risks: [],
      summary: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Deadline Extraction Agent
// ============================================

export interface DeadlineExtractionResult {
  success: boolean
  deadlines: z.infer<typeof deadlineSchema>[]
  processingTime: number
  error?: string
}

export async function extractDeadlines(
  content: string,
  documentId: string,
): Promise<DeadlineExtractionResult> {
  const startTime = Date.now()

  try {
    const { object } = await generateObject({
      model: google(DEFAULT_MODEL),
      schema: z.object({
        deadlines: z.array(deadlineSchema),
      }),
      system: SYSTEM_PROMPTS.deadlineExtraction,
      prompt: `Analise o documento ${documentId} e extraia TODOS os prazos críticos.

Documento:
---
${content}
---

Para cada prazo, identifique:
1. Data limite específica
2. Regras aplicáveis
3. Documentos necessários
4. Certidões técnicas requeridas
5. Multas por descumprimento

Ordene por criticidade (mais críticos primeiro).`,
    })

    return {
      success: true,
      deadlines: object.deadlines,
      processingTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Error extracting deadlines:', error)
    return {
      success: false,
      deadlines: [],
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Risk Assessment Agent
// ============================================

export interface RiskAssessmentResult {
  success: boolean
  level: 'low' | 'medium' | 'high' | 'critical'
  risks: z.infer<typeof riskFactorSchema>[]
  recommendations: string[]
  processingTime: number
  error?: string
}

export async function assessRisks(
  content: string,
  documentId: string,
): Promise<RiskAssessmentResult> {
  const startTime = Date.now()

  try {
    const { object } = await generateObject({
      model: google(DEFAULT_MODEL),
      schema: z.object({
        level: z.enum(['low', 'medium', 'high', 'critical']),
        risks: z.array(riskFactorSchema),
        recommendations: z.array(z.string()),
      }),
      system: SYSTEM_PROMPTS.riskAssessment,
      prompt: `Faça uma avaliação de riscos do documento ${documentId}.

Documento:
---
${content}
---

Analise:
1. Riscos financeiros (multas, penalidades)
2. Riscos de compliance
3. Riscos operacionais
4. Riscos documentais

Forneça recomendações práticas para mitigar cada risco.`,
    })

    return {
      success: true,
      ...object,
      processingTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Error assessing risks:', error)
    return {
      success: false,
      level: 'medium',
      risks: [],
      recommendations: [],
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Interactive Agent with Tools
// ============================================

export async function createDocumentAgent(documentId: string) {
  const tools = {
    searchEntities: tool({
      description:
        'Busca entidades específicas no documento por tipo ou palavra-chave',
      parameters: z.object({
        query: z.string().describe('Termo de busca'),
        type: entitySchema.shape.type.optional(),
      }),
      execute: async ({ query, type }) => {
        // Implementação depende do storage escolhido
        return { message: `Buscando "${query}" do tipo ${type || 'qualquer'}` }
      },
    }),

    getDeadlineDetails: tool({
      description: 'Obtém detalhes completos de um prazo específico',
      parameters: z.object({
        deadlineId: z.string().describe('ID do prazo'),
      }),
      execute: async ({ deadlineId }) => {
        return { message: `Detalhes do prazo ${deadlineId}` }
      },
    }),

    calculateDaysRemaining: tool({
      description: 'Calcula dias restantes até uma data',
      parameters: z.object({
        dueDate: z.string().describe('Data no formato YYYY-MM-DD'),
      }),
      execute: async ({ dueDate }) => {
        const due = new Date(dueDate)
        const now = new Date()
        const diff = Math.ceil(
          (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        return { daysRemaining: diff, isOverdue: diff < 0 }
      },
    }),
  }

  return {
    chat: async (message: string) => {
      const { text } = await generateText({
        model: google(DEFAULT_MODEL),
        system: `Você é um assistente especializado em análise do documento ${documentId}.
        
Ajude o usuário a entender o documento, prazos, riscos e requisitos.
Use as ferramentas disponíveis quando necessário.
Responda sempre em português brasileiro.`,
        prompt: message,
        maxSteps: 5,
        tools,
      })

      return text
    },
  }
}
