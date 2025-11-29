// API Client for communicating with the backend
// Using relative URLs to work with Next.js API routes
const API_BASE_URL = ''

export interface Document {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalPages: number | null
  error: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Entity {
  id: string
  documentId: string
  type: string
  name: string
  description: string
  value: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
  parentId: string | null
  pageNumber: number | null
  sourceText: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface Deadline {
  id: string
  documentId: string
  title: string
  description: string
  dueDate: string
  rules: string[]
  requiredDocuments: string[]
  technicalCertificates: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'upcoming' | 'overdue' | 'completed'
  createdAt: Date
  penalties?: Penalty[]
}

export interface Penalty {
  id: string
  deadlineId: string
  description: string
  type: 'fixed' | 'percentage' | 'daily'
  value: number
  currency: string | null
  conditions: string[]
  createdAt: Date
}

export interface TimelineEvent {
  id: string
  documentId: string
  title: string
  description: string
  date: string
  time: string | null
  type: 'upload' | 'processing' | 'analysis' | 'deadline' | 'alert' | 'reminder'
  status: 'completed' | 'in_progress' | 'pending' | 'alert'
  relatedEntityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

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

  // Documents
  async getDocuments(): Promise<{ documents: Document[] }> {
    const response = await this.request<{
      success: boolean
      data: { documents: Document[] }
    }>('/api/documents')
    return response.data
  }

  async getDocument(id: string): Promise<{
    document: Document
    entities: Entity[]
    deadlines: Deadline[]
    timeline: TimelineEvent[]
    analysis: {
      summary: string
      riskAssessment: {
        level: 'low' | 'medium' | 'high' | 'critical'
        factors: Array<{
          type: string
          description: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          mitigation?: string
        }>
        recommendations: string[]
      }
      completedAt: Date
    } | null
    stats: {
      totalEntities: number
      totalDeadlines: number
      criticalDeadlines: number
      overdueDeadlines: number
    }
  }> {
    const response = await this.request<{
      success: boolean
      data: {
        document: Document
        entities: Entity[]
        deadlines: Deadline[]
        timeline: TimelineEvent[]
        analysis: {
          summary: string
          riskAssessment: {
            level: 'low' | 'medium' | 'high' | 'critical'
            factors: Array<{
              type: string
              description: string
              severity: 'critical' | 'high' | 'medium' | 'low'
              mitigation?: string
            }>
            recommendations: string[]
          }
          completedAt: Date
        } | null
        stats: {
          totalEntities: number
          totalDeadlines: number
          criticalDeadlines: number
          overdueDeadlines: number
        }
      }
    }>(`/api/documents/${id}`)
    return response.data
  }

  async getDocumentEntities(id: string): Promise<{
    entities: Entity[]
    groupedByType: Record<string, Entity[]>
    hierarchy: Array<Entity & { children?: Entity[] }>
    stats: {
      total: number
      byType: Array<{ type: string; count: number; critical: number }>
      byPriority: {
        critical: number
        high: number
        medium: number
        low: number
      }
    }
  }> {
    const response = await this.request<{
      success: boolean
      data: {
        entities: Entity[]
        groupedByType: Record<string, Entity[]>
        hierarchy: Array<Entity & { children?: Entity[] }>
        stats: {
          total: number
          byType: Array<{ type: string; count: number; critical: number }>
          byPriority: {
            critical: number
            high: number
            medium: number
            low: number
          }
        }
      }
    }>(`/api/documents/${id}/entities`)
    return response.data
  }

  async getDocumentDeadlines(id: string): Promise<{
    deadlines: Deadline[]
    groupedByStatus: {
      overdue: Deadline[]
      upcoming: Deadline[]
      pending: Deadline[]
      completed: Deadline[]
    }
    deadlineMap: Array<{
      deadline: Deadline
      requirements: Array<{ type: string; value: string }>
      consequences: Array<{
        type: string
        value: number
        currency: string
        description: string
      }>
    }>
    stats: {
      total: number
      overdue: number
      upcoming: number
      pending: number
      completed: number
      nextDeadline: Deadline | null
      totalPenaltyRisk: number
    }
  }> {
    const response = await this.request<{
      success: boolean
      data: {
        deadlines: Deadline[]
        groupedByStatus: {
          overdue: Deadline[]
          upcoming: Deadline[]
          pending: Deadline[]
          completed: Deadline[]
        }
        deadlineMap: Array<{
          deadline: Deadline
          requirements: Array<{ type: string; value: string }>
          consequences: Array<{
            type: string
            value: number
            currency: string
            description: string
          }>
        }>
        stats: {
          total: number
          overdue: number
          upcoming: number
          pending: number
          completed: number
          nextDeadline: Deadline | null
          totalPenaltyRisk: number
        }
      }
    }>(`/api/documents/${id}/deadlines`)
    return response.data
  }

  async getDocumentTimeline(id: string): Promise<{
    events: TimelineEvent[]
    groupedByDate: Record<string, TimelineEvent[]>
    criticalAlerts: TimelineEvent[]
    summary: {
      total: number
      completed: number
      pending: number
      alerts: number
    }
  }> {
    const response = await this.request<{
      success: boolean
      data: {
        events: TimelineEvent[]
        groupedByDate: Record<string, TimelineEvent[]>
        criticalAlerts: TimelineEvent[]
        summary: {
          total: number
          completed: number
          pending: number
          alerts: number
        }
      }
    }>(`/api/documents/${id}/timeline`)
    return response.data
  }

  async uploadDocument(file: File): Promise<{
    success: boolean
    data: {
      document: Document
      message: string
      nextStep: string
    }
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseURL}/api/upload`
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
    success: boolean
    data: {
      document: Document
      analysis: {
        summary: string
        entitiesCount: number
        deadlinesCount: number
        riskLevel: 'low' | 'medium' | 'high' | 'critical'
      } | null
      processingTime: number
    }
  }> {
    const response = await fetch(
      `${this.baseURL}/api/documents/${id}/process`,
      {
        method: 'POST',
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }
}

export const apiClient = new APIClient()
