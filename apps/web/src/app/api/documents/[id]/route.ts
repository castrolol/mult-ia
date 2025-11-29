import { NextRequest, NextResponse } from 'next/server'
import {
  documentStorage,
  entityStorage,
  deadlineStorage,
  timelineStorage,
  analysisStorage,
} from '@workspace/drizzle/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const document = await documentStorage.get(id)

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 },
      )
    }

    // Get all related data
    const [entities, deadlines, timeline, analysis] = await Promise.all([
      entityStorage.getByDocument(id),
      deadlineStorage.getByDocument(id),
      timelineStorage.getByDocument(id),
      analysisStorage.get(id),
    ])

    // Calculate days remaining for each deadline
    const now = new Date()
    const deadlinesWithDays = deadlines.map((d) => {
      const dueDate = new Date(d.dueDate)
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ...d,
        daysRemaining,
        status:
          daysRemaining < 0
            ? 'overdue'
            : daysRemaining <= 7
              ? 'upcoming'
              : d.status,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        document,
        entities,
        deadlines: deadlinesWithDays,
        timeline,
        analysis: analysis
          ? {
              summary: analysis.summary,
              riskAssessment: analysis.riskAssessment,
              completedAt: analysis.completedAt,
            }
          : null,
        stats: {
          totalEntities: entities.length,
          totalDeadlines: deadlines.length,
          criticalDeadlines: deadlinesWithDays.filter(
            (d) => d.priority === 'critical' || d.status === 'upcoming'
          ).length,
          overdueDeadlines: deadlinesWithDays.filter(
            (d) => d.status === 'overdue'
          ).length,
        },
      },
    })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar documento' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const document = await documentStorage.get(id)

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 },
      )
    }

    // Delete all related data (cascade will handle most of this)
    await Promise.all([
      entityStorage.deleteByDocument(id),
      analysisStorage.delete(id),
      documentStorage.delete(id),
    ])

    return NextResponse.json({
      success: true,
      message: 'Documento e dados relacionados excluídos com sucesso',
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir documento' },
      { status: 500 }
    )
  }
}

