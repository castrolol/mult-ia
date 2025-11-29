import { NextRequest, NextResponse } from 'next/server'
import { documentStorage, entityStorage } from '@workspace/drizzle/storage'
import type { Entity, EntityType } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const document = await documentStorage.get(id)

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 },
      )
    }

    // Get filter params
    const typeFilter = searchParams.get('type') as EntityType | null
    const priorityFilter = searchParams.get('priority')
    const searchQuery = searchParams.get('q')?.toLowerCase()

    // Get entities
    let entities = typeFilter
      ? await entityStorage.getByType(id, typeFilter)
      : await entityStorage.getByDocument(id)

    // Apply filters
    if (priorityFilter) {
      entities = entities.filter((e) => e.priority === priorityFilter)
    }

    if (searchQuery) {
      entities = entities.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery) ||
          e.description.toLowerCase().includes(searchQuery) ||
          e.sourceText?.toLowerCase().includes(searchQuery),
      )
    }

    // Group by type
    const groupedByType = entities.reduce(
      (acc, entity) => {
        if (!acc[entity.type]) {
          acc[entity.type] = []
        }
        acc[entity.type]?.push(entity)
        return acc
      },
      {} as Record<EntityType, Entity[]>,
    )

    // Get type counts
    const typeCounts = Object.entries(groupedByType).map(([type, items]) => {
      const typedItems = items as Entity[]
      return {
        type,
        count: typedItems.length,
        critical: typedItems.filter((i) => i.priority === 'critical').length,
      }
    })

    // Build hierarchy (entities with parentId)
    const buildHierarchy = () => {
      const roots = entities.filter((e) => !e.parentId)
      const children = entities.filter((e) => e.parentId)

      const addChildren = (
        parent: Entity,
      ): Entity & { children?: Entity[] } => {
        const parentChildren = children.filter((c) => c.parentId === parent.id)
        return {
          ...parent,
          children: parentChildren.map(addChildren),
        }
      }

      return roots.map(addChildren)
    }

    return NextResponse.json({
      success: true,
      data: {
        entities,
        groupedByType,
        hierarchy: buildHierarchy(),
        stats: {
          total: entities.length,
          byType: typeCounts,
          byPriority: {
            critical: entities.filter((e) => e.priority === 'critical').length,
            high: entities.filter((e) => e.priority === 'high').length,
            medium: entities.filter((e) => e.priority === 'medium').length,
            low: entities.filter((e) => e.priority === 'low').length,
          },
        },
      },
    })
  } catch (error) {
    console.error('Get entities error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar entidades' },
      { status: 500 },
    )
  }
}
