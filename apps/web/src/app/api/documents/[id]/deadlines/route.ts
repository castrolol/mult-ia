import { NextRequest, NextResponse } from 'next/server'
import { documentStorage, deadlineStorage } from '@workspace/drizzle/storage'

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
    const criticalOnly = searchParams.get('critical') === 'true'
    const priorityFilter = searchParams.get('priority')
    const statusFilter = searchParams.get('status')

    // Get deadlines
    const deadlines = criticalOnly
      ? await deadlineStorage.getCritical(id)
      : await deadlineStorage.getByDocument(id)

    const now = new Date()

    // Enrich deadlines with computed fields
    const enrichedDeadlines = deadlines.map((d) => {
      const dueDate = new Date(d.dueDate)
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      const computedStatus =
        daysRemaining < 0
          ? 'overdue'
          : daysRemaining <= 7
            ? 'upcoming'
            : d.status

      return {
        ...d,
        daysRemaining,
        status: computedStatus,
        isOverdue: daysRemaining < 0,
        isUrgent: daysRemaining >= 0 && daysRemaining <= 7,
        totalPenaltyValue: d.penalties.reduce(
          (sum: number, p: { value: number }) => sum + p.value,
          0,
        ),
      }
    })

    // Apply filters
    let filtered = enrichedDeadlines

    if (priorityFilter) {
      filtered = filtered.filter((d) => d.priority === priorityFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter((d) => d.status === statusFilter)
    }

    // Sort by due date
    filtered.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )

    // Group by status
    const groupedByStatus = {
      overdue: filtered.filter((d) => d.status === 'overdue'),
      upcoming: filtered.filter((d) => d.status === 'upcoming'),
      pending: filtered.filter((d) => d.status === 'pending'),
      completed: filtered.filter((d) => d.status === 'completed'),
    }

    // Map deadlines to requirements/consequences
    const deadlineMap = filtered.map((d) => ({
      deadline: d,
      requirements: [
        ...d.requiredDocuments.map((doc: string) => ({
          type: 'document',
          value: doc,
        })),
        ...d.technicalCertificates.map((cert: string) => ({
          type: 'certificate',
          value: cert,
        })),
      ],
      consequences: d.penalties.map(
        (p: {
          type: string
          value: number
          currency?: string
          description: string
        }) => ({
          type: p.type,
          value: p.value,
          currency: p.currency || 'BRL',
          description: p.description,
        }),
      ),
    }))

    return NextResponse.json({
      success: true,
      data: {
        deadlines: filtered,
        groupedByStatus,
        deadlineMap,
        stats: {
          total: filtered.length,
          overdue: groupedByStatus.overdue.length,
          upcoming: groupedByStatus.upcoming.length,
          pending: groupedByStatus.pending.length,
          completed: groupedByStatus.completed.length,
          nextDeadline: filtered.find((d) => d.daysRemaining >= 0) || null,
          totalPenaltyRisk: filtered
            .filter((d) => d.status !== 'completed')
            .reduce(
              (sum: number, d: { totalPenaltyValue: number }) =>
                sum + d.totalPenaltyValue,
              0,
            ),
        },
      },
    })
  } catch (error) {
    console.error('Get deadlines error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar prazos' },
      { status: 500 },
    )
  }
}
