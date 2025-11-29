import {
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
  integer,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// Documents Table
// ============================================

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  filename: varchar('filename', { length: 500 }).notNull(),
  status: varchar('status', {
    length: 20,
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  totalPages: integer('total_pages'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Document Content Table (stores extracted text)
// ============================================

export const documentContent = pgTable('document_content', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // Base64 encoded or plain text
  extractedText: text('extracted_text'), // Plain text extracted from PDF
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Entities Table
// ============================================

export const entities = pgTable('entities', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  type: varchar('type', {
    length: 50,
    enum: [
      'deadline',
      'delivery_rule',
      'risk',
      'penalty',
      'requirement',
      'technical_certificate',
      'mandatory_document',
      'clause',
      'obligation',
    ],
  }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description').notNull(),
  value: text('value'),
  priority: varchar('priority', {
    length: 20,
    enum: ['critical', 'high', 'medium', 'low'],
  }).notNull(),
  parentId: text('parent_id').references((): AnyPgColumn => entities.id, {
    onDelete: 'set null',
  }),
  pageNumber: integer('page_number'),
  sourceText: text('source_text'),
  metadata: jsonb('metadata').$type<{
    dueDate?: string
    amount?: number
    currency?: string
    percentage?: number
    relatedEntities?: string[]
    conditions?: string[]
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Deadlines Table
// ============================================

export const deadlines = pgTable('deadlines', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  dueDate: varchar('due_date', { length: 50 }).notNull(), // ISO date string
  rules: jsonb('rules').$type<string[]>().notNull().default([]),
  requiredDocuments: jsonb('required_documents')
    .$type<string[]>()
    .notNull()
    .default([]),
  technicalCertificates: jsonb('technical_certificates')
    .$type<string[]>()
    .notNull()
    .default([]),
  priority: varchar('priority', {
    length: 20,
    enum: ['critical', 'high', 'medium', 'low'],
  }).notNull(),
  status: varchar('status', {
    length: 20,
    enum: ['pending', 'upcoming', 'overdue', 'completed'],
  })
    .notNull()
    .default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Penalties Table (related to deadlines)
// ============================================

export const penalties = pgTable('penalties', {
  id: text('id').primaryKey(),
  deadlineId: text('deadline_id')
    .notNull()
    .references(() => deadlines.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  type: varchar('type', {
    length: 20,
    enum: ['fixed', 'percentage', 'daily'],
  }).notNull(),
  value: integer('value').notNull(), // Store as integer (cents) or use decimal
  currency: varchar('currency', { length: 10 }).default('BRL'),
  conditions: jsonb('conditions').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Timeline Events Table
// ============================================

export const timelineEvents = pgTable('timeline_events', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  date: varchar('date', { length: 50 }).notNull(), // ISO date string
  time: varchar('time', { length: 10 }), // HH:mm format
  type: varchar('type', {
    length: 30,
    enum: ['upload', 'processing', 'analysis', 'deadline', 'alert', 'reminder'],
  }).notNull(),
  status: varchar('status', {
    length: 20,
    enum: ['completed', 'in_progress', 'pending', 'alert'],
  }).notNull(),
  relatedEntityId: text('related_entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Document Analysis Table
// ============================================

export const documentAnalyses = pgTable('document_analyses', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .unique()
    .references(() => documents.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  riskAssessment: jsonb('risk_assessment')
    .$type<{
      level: 'low' | 'medium' | 'high' | 'critical'
      factors: Array<{
        type: string
        description: string
        severity: 'critical' | 'high' | 'medium' | 'low'
        mitigation?: string
      }>
      recommendations: string[]
    }>()
    .notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Reminders Table
// ============================================

export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  deadlineId: text('deadline_id')
    .notNull()
    .references(() => deadlines.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  message: text('message').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  channels: jsonb('channels')
    .$type<Array<'email' | 'internal' | 'push'>>()
    .notNull(),
  status: varchar('status', {
    length: 20,
    enum: ['scheduled', 'sent', 'failed', 'cancelled'],
  })
    .notNull()
    .default('scheduled'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================
// Knowledge Base Table
// ============================================

export const knowledgeBase = pgTable('knowledge_base', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  applyMode: varchar('apply_mode', {
    length: 20,
    enum: ['always', 'model-decide'],
  })
    .notNull()
    .default('model-decide'),
  category: varchar('category', {
    length: 50,
    enum: ['certificates', 'products', 'company_docs', 'general'],
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Relations
// ============================================

export const documentsRelations = relations(documents, ({ many, one }) => ({
  entities: many(entities),
  deadlines: many(deadlines),
  timelineEvents: many(timelineEvents),
  analysis: one(documentAnalyses, {
    fields: [documents.id],
    references: [documentAnalyses.documentId],
  }),
  reminders: many(reminders),
  content: one(documentContent, {
    fields: [documents.id],
    references: [documentContent.documentId],
  }),
}))

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  document: one(documents, {
    fields: [entities.documentId],
    references: [documents.id],
  }),
  parent: one(entities, {
    fields: [entities.parentId],
    references: [entities.id],
    relationName: 'parentEntity',
  }),
  children: many(entities, {
    relationName: 'parentEntity',
  }),
}))

export const deadlinesRelations = relations(deadlines, ({ one, many }) => ({
  document: one(documents, {
    fields: [deadlines.documentId],
    references: [documents.id],
  }),
  penalties: many(penalties),
  reminders: many(reminders),
}))

export const penaltiesRelations = relations(penalties, ({ one }) => ({
  deadline: one(deadlines, {
    fields: [penalties.deadlineId],
    references: [deadlines.id],
  }),
}))

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  document: one(documents, {
    fields: [timelineEvents.documentId],
    references: [documents.id],
  }),
}))

export const documentAnalysesRelations = relations(
  documentAnalyses,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentAnalyses.documentId],
      references: [documents.id],
    }),
  }),
)

export const remindersRelations = relations(reminders, ({ one }) => ({
  document: one(documents, {
    fields: [reminders.documentId],
    references: [documents.id],
  }),
  deadline: one(deadlines, {
    fields: [reminders.deadlineId],
    references: [deadlines.id],
  }),
}))

export const documentContentRelations = relations(
  documentContent,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentContent.documentId],
      references: [documents.id],
    }),
  }),
)

// ============================================
// Type Exports
// ============================================

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert

export type Deadline = typeof deadlines.$inferSelect
export type NewDeadline = typeof deadlines.$inferInsert

export type Penalty = typeof penalties.$inferSelect
export type NewPenalty = typeof penalties.$inferInsert

export type TimelineEvent = typeof timelineEvents.$inferSelect
export type NewTimelineEvent = typeof timelineEvents.$inferInsert

export type DocumentAnalysis = typeof documentAnalyses.$inferSelect
export type NewDocumentAnalysis = typeof documentAnalyses.$inferInsert

export type Reminder = typeof reminders.$inferSelect
export type NewReminder = typeof reminders.$inferInsert

export type KnowledgeBase = typeof knowledgeBase.$inferSelect
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert

export type DocumentContent = typeof documentContent.$inferSelect
export type NewDocumentContent = typeof documentContent.$inferInsert
