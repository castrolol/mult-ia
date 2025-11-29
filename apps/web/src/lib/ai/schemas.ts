import { z } from 'zod'

// ============================================
// Entity Schemas
// ============================================

export const entityTypeSchema = z.enum([
  'deadline',
  'delivery_rule',
  'risk',
  'penalty',
  'requirement',
  'technical_certificate',
  'mandatory_document',
  'clause',
  'obligation',
])

export const entityPrioritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
])

export const entityMetadataSchema = z.object({
  dueDate: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  percentage: z.number().optional(),
  relatedEntities: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
})

export const entitySchema = z.object({
  id: z.string(),
  type: entityTypeSchema,
  name: z.string(),
  description: z.string(),
  value: z.string().optional(),
  priority: entityPrioritySchema,
  parentId: z.string().optional(),
  pageNumber: z.number().optional(),
  sourceText: z.string().optional(),
  metadata: entityMetadataSchema.optional(),
})

// ============================================
// Penalty Schema
// ============================================

export const penaltySchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum(['fixed', 'percentage', 'daily']),
  value: z.number(),
  currency: z.string().optional(),
  conditions: z.array(z.string()),
})

// ============================================
// Deadline Schema
// ============================================

export const deadlineSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: z.string().describe('Data no formato YYYY-MM-DD'),
  rules: z.array(z.string()),
  requiredDocuments: z.array(z.string()),
  technicalCertificates: z.array(z.string()),
  penalties: z.array(penaltySchema),
  priority: entityPrioritySchema,
})

// ============================================
// Risk Factor Schema
// ============================================

export const riskFactorSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: entityPrioritySchema,
  mitigation: z.string().optional(),
})

// ============================================
// Document Analysis Response Schema
// ============================================

export const documentAnalysisSchema = z.object({
  summary: z
    .string()
    .describe('Resumo executivo do documento em 2-3 parágrafos'),
  entities: z.array(entitySchema).describe('Lista de entidades identificadas'),
  deadlines: z.array(deadlineSchema).describe('Lista de prazos identificados'),
  risks: z.array(riskFactorSchema).describe('Lista de riscos identificados'),
})

// ============================================
// Timeline Event Schema
// ============================================

export const timelineEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  time: z.string().optional(),
  type: z.enum([
    'upload',
    'processing',
    'analysis',
    'deadline',
    'alert',
    'reminder',
  ]),
  status: z.enum(['completed', 'in_progress', 'pending', 'alert']),
  relatedEntityId: z.string().optional(),
})

// ============================================
// Type Exports from Schemas
// ============================================

export type EntitySchemaType = z.infer<typeof entitySchema>
export type DeadlineSchemaType = z.infer<typeof deadlineSchema>
export type PenaltySchemaType = z.infer<typeof penaltySchema>
export type RiskFactorSchemaType = z.infer<typeof riskFactorSchema>
export type DocumentAnalysisSchemaType = z.infer<typeof documentAnalysisSchema>
export type TimelineEventSchemaType = z.infer<typeof timelineEventSchema>
