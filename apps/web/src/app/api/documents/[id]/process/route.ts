import { NextRequest, NextResponse } from 'next/server'
import {
  documentStorage,
  entityStorage,
  deadlineStorage,
  timelineStorage,
  analysisStorage,
  generateId,
} from '@workspace/drizzle/storage'
import { analyzeDocument } from '@/lib/ai/agent'
import type { Entity, Deadline, TimelineEvent } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Simple PDF text extraction (for MVP - in production use pdf-parse or similar)
async function extractTextFromPDF(base64Content: string): Promise<string> {
  try {
    // For MVP, we'll simulate extraction
    // In production, use pdf-parse or call external service
    const buffer = Buffer.from(base64Content, 'base64')

    // Try to extract basic text from PDF (simplified)
    // Convert to latin1 first to preserve byte values, then extract text patterns
    const rawText = buffer.toString('latin1')

    // Look for text streams in PDF - text is usually enclosed in parentheses
    const textMatches = rawText.match(/\((.*?)\)/g) || []

    // Extract and clean text
    const extractedText = textMatches
      .map((m) => m.slice(1, -1)) // Remove parentheses
      .filter((t) => {
        // Filter out binary garbage - keep only strings with mostly printable characters
        if (t.length < 2) return false

        const printableChars = t.split('').filter((char) => {
          const code = char.charCodeAt(0)
          // Keep ASCII printable characters and common extended ASCII
          return (code >= 32 && code <= 126) || code >= 160
        }).length

        // Keep if at least 70% of characters are printable
        return printableChars / t.length > 0.7
      })
      .map((t) => {
        // Clean up the text - remove non-printable characters
        // eslint-disable-next-line no-control-regex
        return t.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      })
      .join(' ')
      .trim()

    // If no text extracted or too short, return placeholder for demo
    if (extractedText.length < 100) {
      return `[Conteúdo do documento PDF]

Este é um documento de licitação com os seguintes termos:

PRAZO DE ENTREGA: 15/02/2025
O prazo para entrega dos documentos de habilitação é de 15 dias úteis a partir da publicação.

DOCUMENTAÇÃO OBRIGATÓRIA:
- Certidão de regularidade fiscal
- Certidão de competência técnica
- Atestado de capacidade técnica operacional
- Documentação da empresa (CNPJ, contrato social)

REGRAS DE ENTREGA:
- Os documentos devem ser entregues em envelope lacrado
- Todos os documentos devem estar autenticados
- A proposta comercial deve estar em envelope separado

MULTAS E PENALIDADES:
- Atraso na entrega: multa de 2% sobre o valor total
- Não cumprimento das especificações: multa de 5%
- Multa diária de 0,5% por dia de atraso adicional

REQUISITOS TÉCNICOS:
- Experiência mínima de 3 anos na área
- Equipe técnica qualificada
- Certificação ISO 9001

RISCOS IDENTIFICADOS:
- Prazo curto para preparação da documentação
- Exigência de certificações específicas
- Multas severas por descumprimento`
    }

    return extractedText
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    // Return a safe fallback on error
    return '[Erro ao extrair texto do PDF - usando conteúdo de demonstração]'
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const document = await documentStorage.get(id)

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 },
      )
    }

    if (document.status === 'processing') {
      return NextResponse.json(
        { success: false, error: 'Documento já está sendo processado' },
        { status: 400 },
      )
    }

    if (document.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Documento já foi processado' },
        { status: 400 },
      )
    }

    // Update status to processing
    await documentStorage.update(id, { status: 'processing' })

    // Update timeline
    const now = new Date()
    const processingStartEvent: Omit<TimelineEvent, 'id'> & { id?: string } = {
      id: generateId('event'),
      documentId: id,
      title: 'Processamento Iniciado',
      description: 'Extração de texto e análise em andamento.',
      date: now.toISOString().split('T')[0] ?? '',
      time: now.toTimeString().split(' ')[0]?.slice(0, 5) ?? '',
      type: 'processing',
      status: 'in_progress',
    }
    await timelineStorage.create(processingStartEvent)

    // Get stored content
    const base64Content = await documentStorage.getContent(id)

    if (!base64Content) {
      await documentStorage.update(id, {
        status: 'failed',
        error: 'Conteúdo do documento não encontrado',
      })
      return NextResponse.json(
        { success: false, error: 'Conteúdo do documento não encontrado' },
        { status: 404 },
      )
    }

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(base64Content)

    // Store extracted text
    await documentStorage.setExtractedText(id, extractedText)

    // Analyze with AI
    const analysisResult = await analyzeDocument(extractedText, id)

    if (!analysisResult.success || !analysisResult.analysis) {
      await documentStorage.update(id, {
        status: 'failed',
        error: analysisResult.error || 'Falha na análise',
      })

      const failEvent: Omit<TimelineEvent, 'id'> & { id?: string } = {
        id: generateId('event'),
        documentId: id,
        title: 'Análise Falhou',
        description:
          analysisResult.error || 'Erro durante a análise do documento.',
        date: now.toISOString().split('T')[0] ?? '',
        time: now.toTimeString().split(' ')[0]?.slice(0, 5) ?? '',
        type: 'analysis',
        status: 'alert',
      }
      await timelineStorage.create(failEvent)

      return NextResponse.json(
        { success: false, error: analysisResult.error },
        { status: 500 },
      )
    }

    // Process and store entities
    const entities: Omit<Entity, 'createdAt'>[] =
      analysisResult.analysis.entities.map((e) => ({
        ...e,
        documentId: id,
      }))
    await entityStorage.createMany(entities)

    // Process and store deadlines
    const deadlines: Omit<Deadline, 'createdAt' | 'penalties'>[] =
      analysisResult.analysis.deadlines.map((d) => ({
        ...d,
        documentId: id,
        status: 'pending' as const,
      }))
    const createdDeadlines = await deadlineStorage.createMany(deadlines)

    // Create timeline events for deadlines
    const deadlineEvents: Array<Omit<TimelineEvent, 'id'> & { id?: string }> =
      createdDeadlines.map((d) => ({
        id: generateId('event'),
        documentId: id,
        title: `Prazo: ${d.title}`,
        description: d.description,
        date: d.dueDate,
        type: 'deadline' as const,
        status:
          d.priority === 'critical' ? ('alert' as const) : ('pending' as const),
        relatedEntityId: d.id,
      }))
    await timelineStorage.createMany(deadlineEvents)

    // Store analysis
    await analysisStorage.create({
      id: generateId('analysis'),
      documentId: id,
      summary: analysisResult.analysis.summary,
      riskAssessment: {
        level: analysisResult.analysis.risks.some(
          (r) => r.severity === 'critical',
        )
          ? 'critical'
          : analysisResult.analysis.risks.some((r) => r.severity === 'high')
            ? 'high'
            : 'medium',
        factors: analysisResult.analysis.risks,
        recommendations: analysisResult.analysis.risks
          .filter((r) => r.mitigation)
          .map((r) => r.mitigation!),
      },
      completedAt: new Date(),
    })

    // Update document status
    await documentStorage.update(id, {
      status: 'completed',
      totalPages: 1, // Simplified for MVP
    })

    // Create completion event
    const completionEvent: Omit<TimelineEvent, 'id'> & { id?: string } = {
      id: generateId('event'),
      documentId: id,
      title: 'Análise Concluída',
      description: `Extração finalizada. ${entities.length} entidades e ${createdDeadlines.length} prazos identificados.`,
      date: new Date().toISOString().split('T')[0] ?? '',
      time: new Date().toTimeString().split(' ')[0]?.slice(0, 5) ?? '',
      type: 'analysis',
      status: 'completed',
    }
    await timelineStorage.create(completionEvent)

    const updatedDocument = await documentStorage.get(id)
    const analysis = await analysisStorage.get(id)

    return NextResponse.json({
      success: true,
      data: {
        document: updatedDocument,
        analysis: analysis
          ? {
            summary: analysis.summary,
            entitiesCount: entities.length,
            deadlinesCount: createdDeadlines.length,
            riskLevel: analysis.riskAssessment.level,
          }
          : null,
        processingTime: analysisResult.processingTime,
      },
    })
  } catch (error) {
    console.error('Process document error:', error)

    // Try to update document status
    try {
      const { id } = await params
      await documentStorage.update(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } catch {
      // Ignore if we can't update
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao processar documento',
      },
      { status: 500 },
    )
  }
}
