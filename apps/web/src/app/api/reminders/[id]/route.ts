import { NextRequest, NextResponse } from 'next/server'
import { reminderStorage } from '@workspace/drizzle/storage'
import type { ReminderStatus } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const reminder = await reminderStorage.get(id)

    if (!reminder) {
      return NextResponse.json(
        { success: false, error: 'Lembrete não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: reminder,
    })
  } catch (error) {
    console.error('Get reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar lembrete' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const reminder = await reminderStorage.get(id)

    if (!reminder) {
      return NextResponse.json(
        { success: false, error: 'Lembrete não encontrado' },
        { status: 404 },
      )
    }

    // Validate status transition
    const validStatusTransitions: Record<ReminderStatus, ReminderStatus[]> = {
      scheduled: ['sent', 'failed', 'cancelled'],
      sent: [],
      failed: ['scheduled'],
      cancelled: ['scheduled'],
    }

    const currentStatus: ReminderStatus = reminder.status
    const allowedTransitions = validStatusTransitions[currentStatus]

    if (
      body.status &&
      allowedTransitions &&
      !allowedTransitions.includes(body.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Não é possível mudar status de "${reminder.status}" para "${body.status}"`,
        },
        { status: 400 },
      )
    }

    // Update reminder
    const updates: Partial<typeof reminder> = {}

    if (body.title) updates.title = body.title
    if (body.message) updates.message = body.message
    if (body.scheduledFor) updates.scheduledFor = new Date(body.scheduledFor)
    if (body.channels) updates.channels = body.channels
    if (body.status) {
      updates.status = body.status
      if (body.status === 'sent') {
        updates.sentAt = new Date()
      }
    }

    const updated = await reminderStorage.update(id, updates)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Lembrete atualizado com sucesso',
    })
  } catch (error) {
    console.error('Update reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar lembrete' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const reminder = await reminderStorage.get(id)

    if (!reminder) {
      return NextResponse.json(
        { success: false, error: 'Lembrete não encontrado' },
        { status: 404 },
      )
    }

    // Only allow deletion of scheduled or cancelled reminders
    if (reminder.status === 'sent') {
      return NextResponse.json(
        { success: false, error: 'Não é possível excluir lembrete já enviado' },
        { status: 400 },
      )
    }

    await reminderStorage.delete(id)

    return NextResponse.json({
      success: true,
      message: 'Lembrete excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir lembrete' },
      { status: 500 },
    )
  }
}
