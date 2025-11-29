import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseStorage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const item = knowledgeBaseStorage.get(id)

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: item,
    })
  } catch (error) {
    console.error('Get knowledge base item error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar item' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const item = knowledgeBaseStorage.get(id)

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    const updates: Partial<typeof item> = {}

    if (body.content !== undefined) updates.content = body.content
    if (body.applyMode !== undefined) updates.applyMode = body.applyMode
    if (body.category !== undefined) updates.category = body.category

    const updated = knowledgeBaseStorage.update(id, updates)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Item atualizado com sucesso',
    })
  } catch (error) {
    console.error('Update knowledge base item error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const item = knowledgeBaseStorage.get(id)

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    knowledgeBaseStorage.delete(id)

    return NextResponse.json({
      success: true,
      message: 'Item excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete knowledge base item error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir item' },
      { status: 500 }
    )
  }
}

