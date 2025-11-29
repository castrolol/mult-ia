import { NextRequest, NextResponse } from 'next/server'
import { documentStorage } from '@workspace/drizzle/storage'

export async function GET() {
  try {
    const docs = await documentStorage.list()

    return NextResponse.json({
      success: true,
      data: {
        documents: docs,
      },
    })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar documentos' },
      { status: 500 },
    )
  }
}

