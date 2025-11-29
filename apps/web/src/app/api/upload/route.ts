import { NextRequest, NextResponse } from 'next/server'
import {
  documentStorage,
  timelineStorage,
  generateId,
} from '@workspace/drizzle/storage'
import type { TimelineEvent } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 },
      )
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos PDF são aceitos' },
        { status: 400 },
      )
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande. Máximo: 50MB' },
        { status: 400 },
      )
    }

    // Create document record
    const documentId = generateId('doc')
    const now = new Date()

    // Create document record
    const document = await documentStorage.create({
      id: documentId,
      filename: file.name,
      status: 'pending',
    })

    // Create initial timeline events
    const dateStr = now.toISOString().split('T')[0] ?? ''
    const timeStr = now.toTimeString().split(' ')[0]?.slice(0, 5) ?? ''

    const uploadEvent: Omit<TimelineEvent, 'id'> & { id?: string } = {
      id: generateId('event'),
      documentId,
      title: 'Documento Enviado',
      description: `Upload do arquivo "${file.name}" realizado com sucesso.`,
      date: dateStr,
      time: timeStr,
      type: 'upload',
      status: 'completed',
    }

    const processingEvent: Omit<TimelineEvent, 'id'> & { id?: string } = {
      id: generateId('event'),
      documentId,
      title: 'Aguardando Processamento',
      description: 'Documento na fila para processamento.',
      date: dateStr,
      time: timeStr,
      type: 'processing',
      status: 'pending',
    }

    await timelineStorage.createMany([uploadEvent, processingEvent])

    // Convert file to ArrayBuffer and then to base64 for storage
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Store file content temporarily (in production, use S3 or similar)
    await documentStorage.setContent(documentId, base64)

    return NextResponse.json({
      success: true,
      data: {
        document,
        message: 'Arquivo enviado com sucesso. Inicie o processamento.',
        nextStep: `/api/documents/${documentId}/process`,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao fazer upload',
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const docs = await documentStorage.list()

    return NextResponse.json({
      success: true,
      data: docs,
    })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar documentos' },
      { status: 500 },
    )
  }
}
