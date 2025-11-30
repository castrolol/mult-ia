/**
 * Tipos do Frontend
 * Re-exporta tipos do api-client e define tipos adicionais específicos da UI
 */

// Re-exportar todos os tipos do backend via api-client
export type {
  // Status e Enums
  DocumentStatus,
  EntityType,
  ImportanceLevel,
  DocumentSectionLevel,
  LicitacaoPhase,
  DateType,
  ProbabilityLevel,

  // Documentos
  Document,
  DocumentSection,

  // Entidades
  EntitySource,
  ExtractedEntity,

  // Timeline
  TimelineEvent,
  TimelineComment,
  LinkedPenalty,
  LinkedRequirement,
  LinkedObligation,
  UrgencyMetadata,
  RelativeTimeReference,

  // Riscos
  Risk,
  RiskMitigation,

  // Respostas da API
  DocumentsListResponse,
  TimelineResponse,
  TimelineByPhaseResponse,
  StructureResponse,
  SectionDetailResponse,
  RisksResponse,
  CommentsResponse,
} from './api-client'

// ============================================================================
// TIPOS ESPECÍFICOS DA UI
// ============================================================================

/**
 * Item selecionado na UI (hierarquia ou timeline)
 */
export interface SelectedItem {
  id: string
  title: string
  content?: string
  type: 'hierarchy' | 'timeline'
  breadcrumb?: string[]
  sourcePages?: number[]
  metadata?: Record<string, unknown>
}

/**
 * Estado de carregamento genérico
 */
export interface LoadingState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Props genéricas para componentes de lista
 */
export interface ListProps<T> {
  items: T[]
  loading?: boolean
  emptyMessage?: string
  onSelect?: (item: T) => void
  selectedId?: string
}

/**
 * Props para componentes de árvore
 */
export interface TreeNodeProps {
  id: string
  label: string
  level: number
  isExpanded?: boolean
  isSelected?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  onSelect?: () => void
}

/**
 * Filtros de timeline
 */
export interface TimelineFilters {
  phase?: string
  importance?: string
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}

/**
 * Filtros de riscos
 */
export interface RiskFilters {
  category?: string
  severity?: string
  hasMitigation?: boolean
}

/**
 * Estado do visualizador de PDF
 */
export interface PdfViewerState {
  url: string | null
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  scale: number
}

/**
 * Highlight/Annotation no PDF (para uso futuro)
 */
export interface PdfHighlight {
  id: string
  pageNumber: number
  position: {
    boundingRect: {
      x1: number
      y1: number
      x2: number
      y2: number
      width: number
      height: number
    }
    rects: Array<{
      x1: number
      y1: number
      x2: number
      y2: number
      width: number
      height: number
    }>
  }
  content: {
    text?: string
    image?: string
  }
  comment?: string
  entityId?: string
  entityType?: string
}

/**
 * Resposta genérica da API
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Resposta paginada
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
