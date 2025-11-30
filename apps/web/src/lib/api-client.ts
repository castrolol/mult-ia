/**
 * API Client para comunicação com o BFF
 * Todas as chamadas passam pelo BFF que faz proxy para a Job API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'

// ============================================================================
// TIPOS - Espelhados do Backend
// ============================================================================

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type EntityType =
  | 'PRAZO'
  | 'DATA'
  | 'OBRIGACAO'
  | 'REQUISITO'
  | 'MULTA'
  | 'SANCAO'
  | 'RISCO'
  | 'REGRA_ENTREGA'
  | 'CERTIDAO_TECNICA'
  | 'DOCUMENTACAO'
  | 'OUTRO'

export type ImportanceLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type DocumentSectionLevel =
  | 'CHAPTER'
  | 'SECTION'
  | 'CLAUSE'
  | 'SUBCLAUSE'
  | 'ITEM'

export type LicitacaoPhase =
  | 'PUBLICACAO'
  | 'ESCLARECIMENTOS'
  | 'IMPUGNACAO'
  | 'CADASTRO'
  | 'ENVIO_PROPOSTA'
  | 'ABERTURA_PROPOSTAS'
  | 'SESSAO_PUBLICA'
  | 'LANCES'
  | 'JULGAMENTO'
  | 'HABILITACAO'
  | 'RECURSOS'
  | 'ADJUDICACAO'
  | 'HOMOLOGACAO'
  | 'ASSINATURA'
  | 'EXECUCAO'
  | 'PAGAMENTO'
  | 'GARANTIA'
  | 'OUTRO'

export type DateType = 'FIXED' | 'RELATIVE' | 'RANGE'

export type ProbabilityLevel = 'CERTAIN' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY'

// ============================================================================
// INTERFACES
// ============================================================================

export interface Document {
  id: string
  _id?: string
  filename: string
  s3Key?: string
  status: DocumentStatus
  totalPages?: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentSection {
  id: string
  documentId: string
  level: DocumentSectionLevel
  parentId?: string
  order: number
  title: string
  number?: string
  summary?: string
  sourcePages: number[]
  children?: DocumentSection[]
  createdAt: string
}

export interface EntitySource {
  pageNumber: number
  lineStart?: number
  lineEnd?: number
  excerpt: string
  confidence: number
}

export interface ExtractedEntity {
  id: string
  documentId: string
  type: EntityType
  semanticKey: string
  name: string
  rawValue: string
  normalizedValue: string
  sectionId?: string
  parentEntityId?: string
  metadata: Record<string, unknown>
  sources: EntitySource[]
  confidence: number
  createdAt: string
  updatedAt: string
}

export interface LinkedPenalty {
  entityId: string
  type: 'MULTA' | 'SANCAO'
  description: string
  value?: string
}

export interface LinkedRequirement {
  entityId: string
  type: 'REQUISITO' | 'CERTIDAO_TECNICA' | 'DOCUMENTACAO'
  description: string
  mandatory: boolean
}

export interface LinkedObligation {
  entityId: string
  description: string
  actionRequired: string
}

export interface UrgencyMetadata {
  daysUntilDeadline?: number
  hasPenalty: boolean
  penaltyAmount?: string
  blockingForOthers: boolean
}

export interface RelativeTimeReference {
  eventId: string
  offset: number
  unit: 'DAYS' | 'BUSINESS_DAYS' | 'MONTHS'
  direction: 'BEFORE' | 'AFTER'
}

export interface TimelineEvent {
  id: string
  documentId: string
  date: string | null
  dateRaw: string
  dateType: DateType
  relativeTo?: RelativeTimeReference
  eventType: string
  phase: LicitacaoPhase
  semanticOrder: number
  title: string
  description: string
  importance: ImportanceLevel
  actionRequired?: string
  linkedPenalties: LinkedPenalty[]
  linkedRequirements: LinkedRequirement[]
  linkedObligations: LinkedObligation[]
  linkedRiskIds: string[]
  urgency: UrgencyMetadata
  tags: string[]
  sourcePages: number[]
  commentsCount: number
  createdAt: string
}

export interface TimelineComment {
  id: string
  timelineEventId: string
  documentId: string
  content: string
  author: string
  createdAt: string
  updatedAt: string
}

export interface RiskMitigation {
  action: string
  deadline?: string
  cost?: string
}

export interface Risk {
  id: string
  documentId: string
  category: string
  subcategory?: string
  title: string
  description: string
  trigger: string
  consequence: string
  severity: ImportanceLevel
  probability: ProbabilityLevel
  mitigation?: RiskMitigation
  linkedEntityIds: string[]
  linkedTimelineIds: string[]
  linkedSectionIds: string[]
  sources: Array<{
    pageNumber: number
    excerpt: string
    confidence: number
  }>
  createdAt: string
}

// ============================================================================
// RESPOSTAS DA API
// ============================================================================

export interface DocumentsListResponse {
  documents: Document[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TimelineResponse {
  documentId: string
  timeline: TimelineEvent[]
  relativeEvents: TimelineEvent[]
  unresolvedEvents: TimelineEvent[]
  stats: {
    total: number
    withDate: number
    relative: number
    unresolved: number
    byImportance: Record<ImportanceLevel, number>
    upcomingCritical: number
    tags: string[]
  }
}

export interface TimelineByPhaseResponse {
  documentId: string
  phases: Array<{
    phase: LicitacaoPhase
    order: number
    events: TimelineEvent[]
    count: number
  }>
  totalEvents: number
}

export interface StructureResponse {
  documentId: string
  filename: string
  tree: DocumentSection[]
  stats: {
    totalSections: number
    byLevel: Record<DocumentSectionLevel, number>
    maxDepth: number
  }
}

export interface SectionDetailResponse extends DocumentSection {
  breadcrumb: Array<{
    id: string
    number?: string
    title: string
    level: DocumentSectionLevel
  }>
  children: DocumentSection[]
  entities: Array<{
    id: string
    type: EntityType
    name: string
    semanticKey: string
  }>
  childrenCount: number
  entitiesCount: number
}

export interface RisksResponse {
  documentId: string
  risks: Risk[]
  stats: {
    total: number
    bySeverity: Record<ImportanceLevel, number>
    byCategory: Record<string, number>
    needingMitigation: number
  }
}

export interface CommentsResponse {
  eventId: string
  comments: TimelineComment[]
  total: number
}

// ============================================================================
// CHAT RAG
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourcePagesUsed?: number[]
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  messageCount: number
  createdAt: string
  lastMessageAt: string
}

export interface ChatResponse {
  messageId: string
  conversationId: string
  content: string
  sourcePagesUsed: number[]
  sourceSnippets?: Array<{
    pageNumber: number
    excerpt: string
    similarity: number
  }>
}

export interface RagStatus {
  documentId: string
  isReady: boolean
  totalPages: number
  embeddedPages: number
  lastUpdated?: string
}

export interface ConversationsListResponse {
  documentId: string
  conversations: Conversation[]
  total: number
}

export interface ConversationDetailResponse {
  conversation: Conversation
  messages: ChatMessage[]
}

// ============================================================================
// API CLIENT
// ============================================================================

class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // ============================================================================
  // DOCUMENTOS
  // ============================================================================

  async getDocuments(params?: {
    page?: number
    limit?: number
    status?: DocumentStatus
  }): Promise<DocumentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)

    const query = searchParams.toString()
    return this.request<DocumentsListResponse>(
      `/documents${query ? `?${query}` : ''}`,
    )
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}`)
  }

  async getDocumentPdfUrl(
    id: string,
    expiresIn?: number,
  ): Promise<{ url: string; expiresAt: string }> {
    const query = expiresIn ? `?expiresIn=${expiresIn}` : ''
    return this.request<{ url: string; expiresAt: string }>(
      `/documents/${id}/pdf-url${query}`,
    )
  }

  async getDocumentSummary(id: string): Promise<{
    summary: string
    totalPages: number
    entitiesCount: number
    timelineEventsCount: number
    risksCount: number
  }> {
    return this.request(`/documents/${id}/summary`)
  }

  async uploadDocument(file: File): Promise<{
    message: string
    documentId: string
    filename: string
    status: DocumentStatus
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseURL}/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async processDocument(id: string): Promise<{
    message: string
    documentId: string
    status: DocumentStatus
  }> {
    return this.request(`/documents/${id}/process`, {
      method: 'POST',
    })
  }

  // ============================================================================
  // TIMELINE
  // ============================================================================

  async getTimeline(documentId: string): Promise<TimelineResponse> {
    return this.request<TimelineResponse>(`/timeline/${documentId}`)
  }

  async getTimelineCritical(
    documentId: string,
    days?: number,
  ): Promise<{
    documentId: string
    daysAhead: number
    events: TimelineEvent[]
    total: number
  }> {
    const query = days ? `?days=${days}` : ''
    return this.request(`/timeline/${documentId}/critical${query}`)
  }

  async getTimelineByPhase(
    documentId: string,
  ): Promise<TimelineByPhaseResponse> {
    return this.request<TimelineByPhaseResponse>(
      `/timeline/${documentId}/by-phase`,
    )
  }

  async getTimelineEvent(
    documentId: string,
    eventId: string,
  ): Promise<TimelineEvent & { comments: TimelineComment[] }> {
    return this.request(`/timeline/${documentId}/events/${eventId}`)
  }

  // ============================================================================
  // COMENTÁRIOS
  // ============================================================================

  async getComments(
    documentId: string,
    eventId: string,
  ): Promise<CommentsResponse> {
    return this.request<CommentsResponse>(
      `/timeline/${documentId}/events/${eventId}/comments`,
    )
  }

  async addComment(
    documentId: string,
    eventId: string,
    content: string,
    author: string,
  ): Promise<TimelineComment> {
    return this.request(`/timeline/${documentId}/events/${eventId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, author }),
    })
  }

  async updateComment(
    documentId: string,
    eventId: string,
    commentId: string,
    content: string,
  ): Promise<TimelineComment> {
    return this.request(
      `/timeline/${documentId}/events/${eventId}/comments/${commentId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
    )
  }

  async deleteComment(
    documentId: string,
    eventId: string,
    commentId: string,
  ): Promise<{ success: boolean }> {
    return this.request(
      `/timeline/${documentId}/events/${eventId}/comments/${commentId}`,
      {
        method: 'DELETE',
      },
    )
  }

  // ============================================================================
  // ESTRUTURA
  // ============================================================================

  async getStructure(documentId: string): Promise<StructureResponse> {
    return this.request<StructureResponse>(`/structure/${documentId}`)
  }

  async getStructureFlat(
    documentId: string,
    level?: DocumentSectionLevel,
  ): Promise<{
    documentId: string
    sections: DocumentSection[]
    total: number
  }> {
    const query = level ? `?level=${level}` : ''
    return this.request(`/structure/${documentId}/flat${query}`)
  }

  async getStructureRoot(documentId: string): Promise<{
    documentId: string
    sections: DocumentSection[]
    total: number
  }> {
    return this.request(`/structure/${documentId}/root`)
  }

  async getSection(
    documentId: string,
    sectionId: string,
  ): Promise<SectionDetailResponse> {
    return this.request<SectionDetailResponse>(
      `/structure/${documentId}/sections/${sectionId}`,
    )
  }

  async getSectionChildren(
    documentId: string,
    sectionId: string,
  ): Promise<{
    parentId: string
    children: DocumentSection[]
    total: number
  }> {
    return this.request(
      `/structure/${documentId}/sections/${sectionId}/children`,
    )
  }

  // ============================================================================
  // RISCOS
  // ============================================================================

  async getRisks(
    documentId: string,
    params?: {
      category?: string
      severity?: ImportanceLevel
      sortBy?: string
    },
  ): Promise<RisksResponse> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.severity) searchParams.set('severity', params.severity)
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)

    const query = searchParams.toString()
    return this.request<RisksResponse>(
      `/risks/${documentId}${query ? `?${query}` : ''}`,
    )
  }

  async getRisksCritical(documentId: string): Promise<{
    documentId: string
    risks: Risk[]
    total: number
  }> {
    return this.request(`/risks/${documentId}/critical`)
  }

  async getRisksByCategory(documentId: string): Promise<{
    documentId: string
    categories: Array<{
      category: string
      risks: Risk[]
      count: number
    }>
  }> {
    return this.request(`/risks/${documentId}/by-category`)
  }

  async getRisk(documentId: string, riskId: string): Promise<Risk> {
    return this.request(`/risks/${documentId}/${riskId}`)
  }

  // ============================================================================
  // CHAT RAG
  // ============================================================================

  async sendChatMessage(
    documentId: string,
    message: string,
    conversationId?: string,
    topK?: number,
  ): Promise<ChatResponse> {
    return this.request(`/chat/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, topK }),
    })
  }

  async listConversations(documentId: string): Promise<ConversationsListResponse> {
    return this.request<ConversationsListResponse>(`/chat/${documentId}`)
  }

  async createConversation(
    documentId: string,
    title?: string,
  ): Promise<{ id: string; title: string; createdAt: string }> {
    return this.request(`/chat/${documentId}/new`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  }

  async getConversation(
    documentId: string,
    conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return this.request<ConversationDetailResponse>(
      `/chat/${documentId}/${conversationId}`,
    )
  }

  async updateConversationTitle(
    documentId: string,
    conversationId: string,
    title: string,
  ): Promise<{ success: boolean; title: string }> {
    return this.request(`/chat/${documentId}/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    })
  }

  async deleteConversation(
    documentId: string,
    conversationId: string,
  ): Promise<{ success: boolean; messagesDeleted: number }> {
    return this.request(`/chat/${documentId}/${conversationId}`, {
      method: 'DELETE',
    })
  }

  async getRagStatus(documentId: string): Promise<RagStatus> {
    return this.request<RagStatus>(`/chat/${documentId}/rag/status`)
  }

  async prepareRag(
    documentId: string,
    regenerate?: boolean,
  ): Promise<{
    success: boolean
    action: string
    created: number
    skipped?: number
    deleted?: number
    error?: string
  }> {
    return this.request(`/chat/${documentId}/rag/prepare`, {
      method: 'POST',
      body: JSON.stringify({ regenerate }),
    })
  }
}

export const apiClient = new APIClient()
