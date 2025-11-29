import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseStorage, generateId } from '@workspace/drizzle/storage'
import type { KnowledgeBase } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as
      | KnowledgeBase['category']
      | null
    const applyMode = searchParams.get('applyMode') as
      | KnowledgeBase['applyMode']
      | null

    let items: KnowledgeBase[]

    if (category) {
      items = await knowledgeBaseStorage.getByCategory(category)
    } else if (applyMode === 'always') {
      items = await knowledgeBaseStorage.getAlwaysApply()
    } else {
      items = await knowledgeBaseStorage.list()
    }

    // Group by category
    const groupedByCategory = items.reduce(
      (acc, item) => {
        const cat = item.category || 'general'
        if (!acc[cat]) {
          acc[cat] = []
        }
        acc[cat]?.push(item)
        return acc
      },
      {} as Record<string, KnowledgeBase[]>,
    )

    return NextResponse.json({
      success: true,
      data: {
        items,
        groupedByCategory,
        stats: {
          total: items.length,
          alwaysApply: items.filter((i) => i.applyMode === 'always').length,
          modelDecide: items.filter((i) => i.applyMode === 'model-decide')
            .length,
        },
      },
    })
  } catch (error) {
    console.error('Get knowledge base error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar base de conhecimento' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'Conteúdo é obrigatório' },
        { status: 400 },
      )
    }

    const now = new Date()

    const knowledgeBase: KnowledgeBase = {
      id: generateId('kb'),
      content: body.content,
      applyMode: body.applyMode || 'model-decide',
      category: body.category || 'general',
      createdAt: now,
      updatedAt: now,
    }

    await knowledgeBaseStorage.create(knowledgeBase)

    return NextResponse.json({
      success: true,
      data: knowledgeBase,
      message: 'Item adicionado à base de conhecimento',
    })
  } catch (error) {
    console.error('Create knowledge base error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar item na base de conhecimento' },
      { status: 500 },
    )
  }
}
