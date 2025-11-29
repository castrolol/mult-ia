import { NextRequest, NextResponse } from 'next/server'
import {
  reminderStorage,
  documentStorage,
  deadlineStorage,
  generateId,
} from '@workspace/drizzle/storage'
import type { Reminder, CreateReminderRequest } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const deadlineId = searchParams.get('deadlineId')
    const status = searchParams.get('status')
    const pendingOnly = searchParams.get('pending') === 'true'

    let reminders: Reminder[]

    if (pendingOnly) {
      reminders = await reminderStorage.getPending()
    } else if (documentId) {
      reminders = await reminderStorage.getByDocument(documentId)
    } else if (deadlineId) {
      reminders = await reminderStorage.getByDeadline(deadlineId)
    } else {
      // Get all reminders by listing from all documents
      const documents = await documentStorage.list()
      const remindersPromises = documents.map((doc) =>
        reminderStorage.getByDocument(doc.id),
      )
      const remindersArrays = await Promise.all(remindersPromises)
      reminders = remindersArrays.flat()
    }

    // Apply status filter
    if (status) {
      reminders = reminders.filter((r) => r.status === status)
    }

    // Sort by scheduled date
    reminders.sort(
      (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime(),
    )

    // Group by status
    const groupedByStatus = {
      scheduled: reminders.filter((r) => r.status === 'scheduled'),
      sent: reminders.filter((r) => r.status === 'sent'),
      failed: reminders.filter((r) => r.status === 'failed'),
      cancelled: reminders.filter((r) => r.status === 'cancelled'),
    }

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        groupedByStatus,
        stats: {
          total: reminders.length,
          scheduled: groupedByStatus.scheduled.length,
          sent: groupedByStatus.sent.length,
          failed: groupedByStatus.failed.length,
          cancelled: groupedByStatus.cancelled.length,
          nextReminder: groupedByStatus.scheduled[0] || null,
        },
      },
    })
  } catch (error) {
    console.error('Get reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar lembretes' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateReminderRequest = await request.json()

    // Validate required fields
    if (
      !body.documentId ||
      !body.deadlineId ||
      !body.title ||
      !body.message ||
      !body.scheduledFor ||
      !body.channels?.length
    ) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios não preenchidos' },
        { status: 400 },
      )
    }

    // Verify document exists
    const document = await documentStorage.get(body.documentId)
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 },
      )
    }

    // Verify deadline exists
    const deadline = await deadlineStorage.get(body.deadlineId)
    if (!deadline) {
      return NextResponse.json(
        { success: false, error: 'Prazo não encontrado' },
        { status: 404 },
      )
    }

    // Validate scheduled date is in the future
    const scheduledDate = new Date(body.scheduledFor)
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Data do lembrete deve ser no futuro' },
        { status: 400 },
      )
    }

    // Create reminder
    const reminder: Reminder = {
      id: generateId('reminder'),
      documentId: body.documentId,
      deadlineId: body.deadlineId,
      title: body.title,
      message: body.message,
      scheduledFor: scheduledDate,
      channels: body.channels,
      status: 'scheduled',
      createdAt: new Date(),
    }

    await reminderStorage.create(reminder)

    return NextResponse.json({
      success: true,
      data: reminder,
      message: 'Lembrete criado com sucesso',
    })
  } catch (error) {
    console.error('Create reminder error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar lembrete' },
      { status: 500 },
    )
  }
}
