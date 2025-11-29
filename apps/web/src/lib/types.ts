// ============================================
// Document Processing Types
// ============================================

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Document {
  id: string
  filename: string
  status: DocumentStatus
  totalPages?: number
  createdAt: Date
  updatedAt: Date
  error?: string
}

// ============================================
// Entity Classification Types (Must Have)
// ============================================

export type EntityType =
  | 'deadline' // Prazos
  | 'delivery_rule' // Regras de entrega
  | 'risk' // Riscos
  | 'penalty' // Multas
  | 'requirement' // Requisitos
  | 'technical_certificate' // Certidões de competência/capacidade técnica
  | 'mandatory_document' // Documentação obrigatória da empresa
  | 'clause' // Cláusulas
  | 'obligation' // Obrigações

export type EntityPriority = 'critical' | 'high' | 'medium' | 'low'

export interface Entity {
  id: string
  documentId: string
  type: EntityType
  name: string
  description: string
  value?: string
  priority: EntityPriority
  parentId?: string
  pageNumber?: number
  sourceText?: string
  metadata?: EntityMetadata
  createdAt: Date
}

export interface EntityMetadata {
  dueDate?: string
  amount?: number
  currency?: string
  percentage?: number
  relatedEntities?: string[]
  conditions?: string[]
}

// ============================================
// Deadline & Timeline Types (Must Have)
// ============================================

export interface Deadline {
  id: string
  documentId: string
  title: string
  description: string
  dueDate: string
  rules: string[]
  requiredDocuments: string[]
  technicalCertificates: string[]
  penalties: Penalty[]
  priority: EntityPriority
  status: 'pending' | 'upcoming' | 'overdue' | 'completed'
  daysRemaining?: number
  createdAt: Date
}

export interface Penalty {
  id: string
  deadlineId: string
  description: string
  type: 'fixed' | 'percentage' | 'daily'
  value: number
  currency?: string
  conditions: string[]
}

export interface TimelineEvent {
  id: string
  documentId: string
  title: string
  description: string
  date: string
  time?: string
  type: 'upload' | 'processing' | 'analysis' | 'deadline' | 'alert' | 'reminder'
  status: 'completed' | 'in_progress' | 'pending' | 'alert'
  relatedEntityId?: string
  metadata?: Record<string, unknown>
}

// ============================================
// Document Analysis Types
// ============================================

export interface DocumentAnalysis {
  id: string
  documentId: string
  summary: string
  entities: Entity[]
  deadlines: Deadline[]
  timeline: TimelineEvent[]
  riskAssessment: RiskAssessment
  completedAt: Date
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  recommendations: string[]
}

export interface RiskFactor {
  type: string
  description: string
  severity: EntityPriority
  mitigation?: string
}

// ============================================
// AI Analysis Request/Response Types
// ============================================

export interface AnalyzeDocumentRequest {
  documentId: string
  content: string
  pageNumber?: number
  options?: AnalysisOptions
}

export interface AnalysisOptions {
  extractDeadlines?: boolean
  extractRisks?: boolean
  extractPenalties?: boolean
  extractRequirements?: boolean
  extractCertificates?: boolean
  language?: 'pt-BR' | 'en-US'
}

export interface AnalyzeDocumentResponse {
  success: boolean
  documentId: string
  analysis: {
    summary: string
    entities: Entity[]
    deadlines: Deadline[]
    risks: RiskFactor[]
  }
  processingTime: number
  error?: string
}

// ============================================
// Reminder Types (Should Have)
// ============================================

export type ReminderChannel = 'email' | 'internal' | 'push'
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'

export interface Reminder {
  id: string
  documentId: string
  deadlineId: string
  title: string
  message: string
  scheduledFor: Date
  channels: ReminderChannel[]
  status: ReminderStatus
  sentAt?: Date
  createdAt: Date
}

export interface CreateReminderRequest {
  documentId: string
  deadlineId: string
  title: string
  message: string
  scheduledFor: string
  channels: ReminderChannel[]
}

// ============================================
// Knowledge Base Types (Should Have)
// ============================================

export type KnowledgeBaseApplyMode = 'always' | 'model-decide'

export interface KnowledgeBase {
  id: string
  content: string
  applyMode: KnowledgeBaseApplyMode
  category?: 'certificates' | 'products' | 'company_docs' | 'general'
  createdAt: Date
  updatedAt: Date
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
