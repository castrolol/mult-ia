import { NextRequest, NextResponse } from 'next/server'
import {
  documentStorage,
  deadlineStorage,
  timelineStorage,
} from '@workspace/drizzle/storage'
import type { Deadline } from '@/lib/types'

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

    // Get all timeline events
    const events = await timelineStorage.getByDocument(id)

    // Get deadlines and convert to timeline format
    const deadlines = await deadlineStorage.getByDocument(id)
    const now = new Date()

    // Calculate status for deadlines
    const deadlineEvents = deadlines.map((d: Deadline) => {
      const dueDate = new Date(d.dueDate)
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      let status: 'pending' | 'alert' | 'completed' = 'pending'
      if (daysRemaining < 0) {
        status = 'alert' // overdue
      } else if (daysRemaining <= 7) {
        status = 'alert' // upcoming critical
      }

      return {
        id: `deadline-${d.id}`,
        documentId: id,
        title: d.title,
        description: d.description,
        date: d.dueDate,
        type: 'deadline' as const,
        status,
        relatedEntityId: d.id,
        metadata: {
          daysRemaining,
          priority: d.priority,
          rulesCount: d.rules.length,
          penaltiesCount: d.penalties.length,
          requiredDocumentsCount: d.requiredDocuments.length,
        },
      }
    })

    // Merge and sort all events
    const allEvents = [...events, ...deadlineEvents].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    // Group events by date for visual timeline
    const groupedByDate = allEvents.reduce(
      (acc, event) => {
        const date = event.date
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(event)
        return acc
      },
      {} as Record<string, typeof allEvents>,
    )

    // Get critical alerts
    const criticalAlerts = allEvents.filter(
      (e) =>
        e.status === 'alert' ||
        (e.metadata &&
          typeof e.metadata === 'object' &&
          'daysRemaining' in e.metadata &&
          typeof e.metadata.daysRemaining === 'number' &&
          e.metadata.daysRemaining <= 7),
    )

    return NextResponse.json({
      success: true,
      data: {
        events: allEvents,
        groupedByDate,
        criticalAlerts,
        summary: {
          total: allEvents.length,
          completed: allEvents.filter((e) => e.status === 'completed').length,
          pending: allEvents.filter((e) => e.status === 'pending').length,
          alerts: allEvents.filter((e) => e.status === 'alert').length,
        },
      },
    })
  } catch (error) {
    console.error('Get timeline error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar timeline' },
      { status: 500 },
    )
  }
}
