import { eq, and, or, sql, desc, asc } from 'drizzle-orm'
import { db } from './index'
import {
  documents,
  entities,
  deadlines,
  penalties,
  timelineEvents,
  documentAnalyses,
  reminders,
  knowledgeBase,
  documentContent,
  type Document as DbDocument,
  type Entity as DbEntity,
  type Deadline as DbDeadline,
  type TimelineEvent as DbTimelineEvent,
  type Reminder as DbReminder,
  type KnowledgeBase as DbKnowledgeBase,
} from './entities/schema'
import type {
  Document,
  Entity,
  Deadline,
  Penalty,
  TimelineEvent,
  DocumentAnalysis,
  Reminder,
  KnowledgeBase,
} from '@workspace/web/src/lib/types'

// ============================================
// Type Converters (DB -> App Types)
// ============================================

const convertDocument = (dbDoc: DbDocument): Document => ({
  id: dbDoc.id,
  filename: dbDoc.filename,
  status: dbDoc.status as Document['status'],
  totalPages: dbDoc.totalPages ?? undefined,
  createdAt: dbDoc.createdAt,
  updatedAt: dbDoc.updatedAt,
  error: dbDoc.error ?? undefined,
})

const convertEntity = (dbEntity: DbEntity): Entity => ({
  id: dbEntity.id,
  documentId: dbEntity.documentId,
  type: dbEntity.type as Entity['type'],
  name: dbEntity.name,
  description: dbEntity.description,
  value: dbEntity.value ?? undefined,
  priority: dbEntity.priority as Entity['priority'],
  parentId: dbEntity.parentId ?? undefined,
  pageNumber: dbEntity.pageNumber ?? undefined,
  sourceText: dbEntity.sourceText ?? undefined,
  metadata: dbEntity.metadata ?? undefined,
  createdAt: dbEntity.createdAt,
})

const convertDeadline = async (dbDeadline: DbDeadline): Promise<Deadline> => {
  const dbPenalties = await db
    .select()
    .from(penalties)
    .where(eq(penalties.deadlineId, dbDeadline.id))

  const convertedPenalties: Penalty[] = dbPenalties.map((p) => ({
    id: p.id,
    deadlineId: p.deadlineId,
    description: p.description,
    type: p.type as Penalty['type'],
    value: p.value,
    currency: p.currency ?? undefined,
    conditions: p.conditions,
  }))

  return {
    id: dbDeadline.id,
    documentId: dbDeadline.documentId,
    title: dbDeadline.title,
    description: dbDeadline.description,
    dueDate: dbDeadline.dueDate,
    rules: dbDeadline.rules,
    requiredDocuments: dbDeadline.requiredDocuments,
    technicalCertificates: dbDeadline.technicalCertificates,
    penalties: convertedPenalties,
    priority: dbDeadline.priority as Deadline['priority'],
    status: dbDeadline.status as Deadline['status'],
    createdAt: dbDeadline.createdAt,
  }
}

const convertTimelineEvent = (dbEvent: DbTimelineEvent): TimelineEvent => ({
  id: dbEvent.id,
  documentId: dbEvent.documentId,
  title: dbEvent.title,
  description: dbEvent.description,
  date: dbEvent.date,
  time: dbEvent.time ?? undefined,
  type: dbEvent.type as TimelineEvent['type'],
  status: dbEvent.status as TimelineEvent['status'],
  relatedEntityId: dbEvent.relatedEntityId ?? undefined,
  metadata: dbEvent.metadata ?? undefined,
})

const convertReminder = (dbReminder: DbReminder): Reminder => ({
  id: dbReminder.id,
  documentId: dbReminder.documentId,
  deadlineId: dbReminder.deadlineId,
  title: dbReminder.title,
  message: dbReminder.message,
  scheduledFor: dbReminder.scheduledFor,
  channels: dbReminder.channels as Reminder['channels'],
  status: dbReminder.status as Reminder['status'],
  sentAt: dbReminder.sentAt ?? undefined,
  createdAt: dbReminder.createdAt,
})

const convertKnowledgeBase = (dbKb: DbKnowledgeBase): KnowledgeBase => ({
  id: dbKb.id,
  content: dbKb.content,
  applyMode: dbKb.applyMode as KnowledgeBase['applyMode'],
  category: dbKb.category as KnowledgeBase['category'] | undefined,
  createdAt: dbKb.createdAt,
  updatedAt: dbKb.updatedAt,
})

// ============================================
// Document Operations
// ============================================

export const documentStorage = {
  create: async (
    doc: Omit<Document, 'createdAt' | 'updatedAt'>,
  ): Promise<Document> => {
    const [created] = await db
      .insert(documents)
      .values({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        totalPages: doc.totalPages,
        error: doc.error,
      })
      .returning()

    return convertDocument(created)
  },

  get: async (id: string): Promise<Document | undefined> => {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id))
    return doc ? convertDocument(doc) : undefined
  },

  update: async (
    id: string,
    updates: Partial<Omit<Document, 'id' | 'createdAt'>>,
  ): Promise<Document | undefined> => {
    const [updated] = await db
      .update(documents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning()

    return updated ? convertDocument(updated) : undefined
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db.delete(documents).where(eq(documents.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },

  list: async (): Promise<Document[]> => {
    const docs = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt))
    return docs.map(convertDocument)
  },

  setContent: async (documentId: string, content: string): Promise<void> => {
    // Check if content already exists
    const [existing] = await db
      .select()
      .from(documentContent)
      .where(eq(documentContent.documentId, documentId))

    if (existing) {
      await db
        .update(documentContent)
        .set({ content, updatedAt: new Date() })
        .where(eq(documentContent.documentId, documentId))
    } else {
      await db.insert(documentContent).values({
        id: generateId('content'),
        documentId,
        content,
        extractedText: null,
      })
    }
  },

  setExtractedText: async (
    documentId: string,
    extractedText: string,
  ): Promise<void> => {
    const [existing] = await db
      .select()
      .from(documentContent)
      .where(eq(documentContent.documentId, documentId))

    if (existing) {
      // Update existing record, preserving content
      await db
        .update(documentContent)
        .set({
          extractedText: extractedText,
          updatedAt: new Date(),
        })
        .where(eq(documentContent.documentId, documentId))
    } else {
      // Insert new record - content should have been set before extractedText
      // If not, use empty string as fallback
      await db.insert(documentContent).values({
        id: generateId('content'),
        documentId,
        content: '', // Will be updated if needed
        extractedText: extractedText,
      })
    }
  },

  getContent: async (documentId: string): Promise<string | undefined> => {
    const [content] = await db
      .select()
      .from(documentContent)
      .where(eq(documentContent.documentId, documentId))
    return content?.content ?? undefined
  },

  getExtractedText: async (documentId: string): Promise<string | undefined> => {
    const [content] = await db
      .select()
      .from(documentContent)
      .where(eq(documentContent.documentId, documentId))
    return content?.extractedText ?? undefined
  },
}

// ============================================
// Entity Operations
// ============================================

export const entityStorage = {
  create: async (entity: Omit<Entity, 'createdAt'>): Promise<Entity> => {
    const [created] = await db
      .insert(entities)
      .values({
        id: entity.id,
        documentId: entity.documentId,
        type: entity.type,
        name: entity.name,
        description: entity.description,
        value: entity.value,
        priority: entity.priority,
        parentId: entity.parentId,
        pageNumber: entity.pageNumber,
        sourceText: entity.sourceText,
        metadata: entity.metadata,
      })
      .returning()

    return convertEntity(created)
  },

  createMany: async (
    entitiesList: Omit<Entity, 'createdAt'>[],
  ): Promise<Entity[]> => {
    if (entitiesList.length === 0) return []

    const inserted = await db
      .insert(entities)
      .values(
        entitiesList.map((e) => ({
          id: e.id,
          documentId: e.documentId,
          type: e.type,
          name: e.name,
          description: e.description,
          value: e.value,
          priority: e.priority,
          parentId: e.parentId,
          pageNumber: e.pageNumber,
          sourceText: e.sourceText,
          metadata: e.metadata,
        })),
      )
      .returning()

    return inserted.map(convertEntity)
  },

  get: async (id: string): Promise<Entity | undefined> => {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id))
    return entity ? convertEntity(entity) : undefined
  },

  getByDocument: async (documentId: string): Promise<Entity[]> => {
    const entitiesList = await db
      .select()
      .from(entities)
      .where(eq(entities.documentId, documentId))
      .orderBy(asc(entities.createdAt))

    return entitiesList.map(convertEntity)
  },

  getByType: async (
    documentId: string,
    type: Entity['type'],
  ): Promise<Entity[]> => {
    const entitiesList = await db
      .select()
      .from(entities)
      .where(and(eq(entities.documentId, documentId), eq(entities.type, type)))
      .orderBy(asc(entities.createdAt))

    return entitiesList.map(convertEntity)
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db.delete(entities).where(eq(entities.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },

  deleteByDocument: async (documentId: string): Promise<void> => {
    await db.delete(entities).where(eq(entities.documentId, documentId))
  },
}

// ============================================
// Deadline Operations
// ============================================

export const deadlineStorage = {
  create: async (
    deadline: Omit<Deadline, 'createdAt' | 'penalties'>,
  ): Promise<Deadline> => {
    const [created] = await db
      .insert(deadlines)
      .values({
        id: deadline.id,
        documentId: deadline.documentId,
        title: deadline.title,
        description: deadline.description,
        dueDate: deadline.dueDate,
        rules: deadline.rules,
        requiredDocuments: deadline.requiredDocuments,
        technicalCertificates: deadline.technicalCertificates,
        priority: deadline.priority,
        status: deadline.status,
      })
      .returning()

    // Insert penalties
    if (deadline.penalties && deadline.penalties.length > 0) {
      await db.insert(penalties).values(
        deadline.penalties.map((p) => ({
          id: p.id,
          deadlineId: deadline.id,
          description: p.description,
          type: p.type,
          value: p.value,
          currency: p.currency,
          conditions: p.conditions,
        })),
      )
    }

    return convertDeadline(created)
  },

  createMany: async (
    deadlinesList: Omit<Deadline, 'createdAt' | 'penalties'>[],
  ): Promise<Deadline[]> => {
    if (deadlinesList.length === 0) return []

    const inserted = await db
      .insert(deadlines)
      .values(
        deadlinesList.map((d) => ({
          id: d.id,
          documentId: d.documentId,
          title: d.title,
          description: d.description,
          dueDate: d.dueDate,
          rules: d.rules,
          requiredDocuments: d.requiredDocuments,
          technicalCertificates: d.technicalCertificates,
          priority: d.priority,
          status: d.status,
        })),
      )
      .returning()

    // Insert all penalties
    const allPenalties = deadlinesList.flatMap((d) =>
      (d.penalties || []).map((p) => ({
        id: p.id,
        deadlineId: d.id,
        description: p.description,
        type: p.type,
        value: p.value,
        currency: p.currency,
        conditions: p.conditions,
      })),
    )

    if (allPenalties.length > 0) {
      await db.insert(penalties).values(allPenalties)
    }

    return Promise.all(inserted.map(convertDeadline))
  },

  get: async (id: string): Promise<Deadline | undefined> => {
    const [deadline] = await db
      .select()
      .from(deadlines)
      .where(eq(deadlines.id, id))
    return deadline ? convertDeadline(deadline) : undefined
  },

  getByDocument: async (documentId: string): Promise<Deadline[]> => {
    const deadlinesList = await db
      .select()
      .from(deadlines)
      .where(eq(deadlines.documentId, documentId))
      .orderBy(asc(deadlines.dueDate))

    return Promise.all(deadlinesList.map(convertDeadline))
  },

  getCritical: async (documentId: string): Promise<Deadline[]> => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const deadlinesList = await db
      .select()
      .from(deadlines)
      .where(
        and(
          eq(deadlines.documentId, documentId),
          or(
            eq(deadlines.priority, 'critical'),
            sql`${deadlines.dueDate} <= ${sevenDaysFromNow.toISOString().split('T')[0]}`,
          ),
        ),
      )
      .orderBy(asc(deadlines.dueDate))

    return Promise.all(deadlinesList.map(convertDeadline))
  },

  update: async (
    id: string,
    updates: Partial<Omit<Deadline, 'id' | 'createdAt' | 'penalties'>>,
  ): Promise<Deadline | undefined> => {
    const [updated] = await db
      .update(deadlines)
      .set(updates)
      .where(eq(deadlines.id, id))
      .returning()

    return updated ? convertDeadline(updated) : undefined
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db.delete(deadlines).where(eq(deadlines.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },
}

// ============================================
// Timeline Operations
// ============================================

export const timelineStorage = {
  create: async (
    event: Omit<TimelineEvent, 'id'> & { id?: string },
  ): Promise<TimelineEvent> => {
    const [created] = await db
      .insert(timelineEvents)
      .values({
        id: event.id,
        documentId: event.documentId,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        status: event.status,
        relatedEntityId: event.relatedEntityId,
        metadata: event.metadata,
      })
      .returning()

    return convertTimelineEvent(created)
  },

  createMany: async (
    events: Array<Omit<TimelineEvent, 'id'> & { id?: string }>,
  ): Promise<TimelineEvent[]> => {
    if (events.length === 0) return []

    const inserted = await db
      .insert(timelineEvents)
      .values(
        events.map((e) => ({
          id: e.id,
          documentId: e.documentId,
          title: e.title,
          description: e.description,
          date: e.date,
          time: e.time,
          type: e.type,
          status: e.status,
          relatedEntityId: e.relatedEntityId,
          metadata: e.metadata,
        })),
      )
      .returning()

    return inserted.map(convertTimelineEvent)
  },

  getByDocument: async (documentId: string): Promise<TimelineEvent[]> => {
    const events = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.documentId, documentId))
      .orderBy(asc(timelineEvents.date), asc(timelineEvents.time))

    return events.map(convertTimelineEvent)
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db
      .delete(timelineEvents)
      .where(eq(timelineEvents.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },
}

// ============================================
// Analysis Operations
// ============================================

export const analysisStorage = {
  create: async (
    analysis: Omit<
      DocumentAnalysis,
      'id' | 'entities' | 'deadlines' | 'timeline'
    >,
  ): Promise<DocumentAnalysis> => {
    const [created] = await db
      .insert(documentAnalyses)
      .values({
        id: analysis.id,
        documentId: analysis.documentId,
        summary: analysis.summary,
        riskAssessment: analysis.riskAssessment,
        completedAt: analysis.completedAt,
      })
      .returning()

    // Get related entities, deadlines, and timeline
    const [entitiesList, deadlinesList, timelineList] = await Promise.all([
      entityStorage.getByDocument(analysis.documentId),
      deadlineStorage.getByDocument(analysis.documentId),
      timelineStorage.getByDocument(analysis.documentId),
    ])

    return {
      id: created.id,
      documentId: created.documentId,
      summary: created.summary,
      entities: entitiesList,
      deadlines: deadlinesList,
      timeline: timelineList,
      riskAssessment:
        created.riskAssessment as DocumentAnalysis['riskAssessment'],
      completedAt: created.completedAt,
    }
  },

  get: async (documentId: string): Promise<DocumentAnalysis | undefined> => {
    const [analysis] = await db
      .select()
      .from(documentAnalyses)
      .where(eq(documentAnalyses.documentId, documentId))

    if (!analysis) return undefined

    // Get related entities, deadlines, and timeline
    const [entitiesList, deadlinesList, timelineList] = await Promise.all([
      entityStorage.getByDocument(documentId),
      deadlineStorage.getByDocument(documentId),
      timelineStorage.getByDocument(documentId),
    ])

    return {
      id: analysis.id,
      documentId: analysis.documentId,
      summary: analysis.summary,
      entities: entitiesList,
      deadlines: deadlinesList,
      timeline: timelineList,
      riskAssessment:
        analysis.riskAssessment as DocumentAnalysis['riskAssessment'],
      completedAt: analysis.completedAt,
    }
  },

  delete: async (documentId: string): Promise<boolean> => {
    const result = await db
      .delete(documentAnalyses)
      .where(eq(documentAnalyses.documentId, documentId))
    return result.rowCount !== null && result.rowCount > 0
  },
}

// ============================================
// Reminder Operations
// ============================================

export const reminderStorage = {
  create: async (reminder: Omit<Reminder, 'createdAt'>): Promise<Reminder> => {
    const [created] = await db
      .insert(reminders)
      .values({
        id: reminder.id,
        documentId: reminder.documentId,
        deadlineId: reminder.deadlineId,
        title: reminder.title,
        message: reminder.message,
        scheduledFor: reminder.scheduledFor,
        channels: reminder.channels,
        status: reminder.status,
        sentAt: reminder.sentAt,
      })
      .returning()

    return convertReminder(created)
  },

  get: async (id: string): Promise<Reminder | undefined> => {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id))
    return reminder ? convertReminder(reminder) : undefined
  },

  getByDocument: async (documentId: string): Promise<Reminder[]> => {
    const remindersList = await db
      .select()
      .from(reminders)
      .where(eq(reminders.documentId, documentId))
      .orderBy(asc(reminders.scheduledFor))

    return remindersList.map(convertReminder)
  },

  getByDeadline: async (deadlineId: string): Promise<Reminder[]> => {
    const remindersList = await db
      .select()
      .from(reminders)
      .where(eq(reminders.deadlineId, deadlineId))
      .orderBy(asc(reminders.scheduledFor))

    return remindersList.map(convertReminder)
  },

  getPending: async (): Promise<Reminder[]> => {
    const remindersList = await db
      .select()
      .from(reminders)
      .where(eq(reminders.status, 'scheduled'))
      .orderBy(asc(reminders.scheduledFor))

    return remindersList.map(convertReminder)
  },

  update: async (
    id: string,
    updates: Partial<Omit<Reminder, 'id' | 'createdAt'>>,
  ): Promise<Reminder | undefined> => {
    const [updated] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning()

    return updated ? convertReminder(updated) : undefined
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db.delete(reminders).where(eq(reminders.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },
}

// ============================================
// Knowledge Base Operations
// ============================================

export const knowledgeBaseStorage = {
  create: async (
    kb: Omit<KnowledgeBase, 'createdAt' | 'updatedAt'>,
  ): Promise<KnowledgeBase> => {
    const [created] = await db
      .insert(knowledgeBase)
      .values({
        id: kb.id,
        content: kb.content,
        applyMode: kb.applyMode,
        category: kb.category,
      })
      .returning()

    return convertKnowledgeBase(created)
  },

  get: async (id: string): Promise<KnowledgeBase | undefined> => {
    const [kb] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id))
    return kb ? convertKnowledgeBase(kb) : undefined
  },

  list: async (): Promise<KnowledgeBase[]> => {
    const kbs = await db
      .select()
      .from(knowledgeBase)
      .orderBy(desc(knowledgeBase.createdAt))
    return kbs.map(convertKnowledgeBase)
  },

  getByCategory: async (
    category: KnowledgeBase['category'],
  ): Promise<KnowledgeBase[]> => {
    const kbs = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.category, category))
      .orderBy(desc(knowledgeBase.createdAt))

    return kbs.map(convertKnowledgeBase)
  },

  getAlwaysApply: async (): Promise<KnowledgeBase[]> => {
    const kbs = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.applyMode, 'always'))
      .orderBy(desc(knowledgeBase.createdAt))

    return kbs.map(convertKnowledgeBase)
  },

  update: async (
    id: string,
    updates: Partial<Omit<KnowledgeBase, 'id' | 'createdAt'>>,
  ): Promise<KnowledgeBase | undefined> => {
    const [updated] = await db
      .update(knowledgeBase)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBase.id, id))
      .returning()

    return updated ? convertKnowledgeBase(updated) : undefined
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db
      .delete(knowledgeBase)
      .where(eq(knowledgeBase.id, id))
    return result.rowCount !== null && result.rowCount > 0
  },
}

// ============================================
// Utility Functions
// ============================================

import { createId } from '@paralleldrive/cuid2'

export const generateId = (prefix?: string): string => {
  const id = createId()
  return prefix ? `${prefix}-${id}` : id
}
