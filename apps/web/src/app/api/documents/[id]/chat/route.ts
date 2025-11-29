import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { google, DEFAULT_MODEL, SYSTEM_PROMPTS } from '@/lib/ai/config'
import {
  documentStorage,
  entityStorage,
  deadlineStorage,
  analysisStorage,
  knowledgeBaseStorage,
} from '@workspace/drizzle/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { messages } = await request.json()

    const document = await documentStorage.get(id)

    if (!document) {
      return new Response(
        JSON.stringify({ error: 'Documento não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Get document context
    const entities = await entityStorage.getByDocument(id)
    const deadlines = await deadlineStorage.getByDocument(id)
    const analysis = await analysisStorage.get(id)
    const content = await documentStorage.getContent(id)

    // Get knowledge base that should always be applied
    const alwaysApplyKB = await knowledgeBaseStorage.getAlwaysApply()

    // Build context for the AI
    const now = new Date()
    const deadlinesWithDays = deadlines.map((d) => {
      const dueDate = new Date(d.dueDate)
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
      return { ...d, daysRemaining }
    })

    const contextParts = [
      `# Contexto do Documento: ${document.filename}`,
      '',
      '## Resumo da Análise',
      analysis?.summary || 'Análise não disponível.',
      '',
      '## Entidades Identificadas',
      entities.length > 0
        ? entities
            .map(
              (e) =>
                `- **${e.type}**: ${e.name} (${e.priority}) - ${e.description}`,
            )
            .join('\n')
        : 'Nenhuma entidade identificada.',
      '',
      '## Prazos Críticos',
      deadlinesWithDays.length > 0
        ? deadlinesWithDays
            .map(
              (d) =>
                `- **${d.title}** (${d.dueDate}): ${d.daysRemaining} dias restantes - ${d.description}`,
            )
            .join('\n')
        : 'Nenhum prazo identificado.',
      '',
      '## Avaliação de Riscos',
      analysis?.riskAssessment
        ? `Nível: ${analysis.riskAssessment.level.toUpperCase()}\n${analysis.riskAssessment.factors.map((f: { type: string; description: string }) => `- ${f.type}: ${f.description}`).join('\n')}`
        : 'Avaliação não disponível.',
    ]

    // Add knowledge base context if available
    if (alwaysApplyKB.length > 0) {
      contextParts.push(
        '',
        '## Base de Conhecimento da Empresa',
        alwaysApplyKB.map((kb) => kb.content).join('\n\n'),
      )
    }

    // Add document content if available (truncated for context window)
    if (content && content.length < 10000) {
      contextParts.push('', '## Conteúdo do Documento', content)
    }

    const systemPrompt = `${SYSTEM_PROMPTS.documentAnalysis}

${contextParts.join('\n')}

---

Você é um assistente especializado neste documento específico. 
Responda perguntas sobre prazos, requisitos, multas, riscos e quaisquer outras informações do documento.
Seja objetivo e prático em suas respostas.
Se não tiver certeza sobre algo, diga claramente.
Sempre responda em português brasileiro.`

    const result = streamText({
      model: google(DEFAULT_MODEL),
      system: systemPrompt,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro no chat',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
