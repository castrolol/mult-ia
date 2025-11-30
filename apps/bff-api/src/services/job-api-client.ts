/**
 * Cliente HTTP para comunicação com a Job API
 * Centraliza todas as chamadas ao serviço de processamento
 */

const JOB_API_URL = process.env.JOB_API_URL || 'http://localhost:3002';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * Faz uma requisição para a Job API
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;
  
  let url = `${JOB_API_URL}${path}`;
  
  // Adicionar query params
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' })) as { error?: string };
    throw new JobApiError(response.status, errorData.error || 'Erro na Job API');
  }
  
  return response.json() as Promise<T>;
}

/**
 * Erro customizado para respostas da Job API
 */
export class JobApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'JobApiError';
  }
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export const documentsApi = {
  /**
   * Lista documentos com paginação
   */
  list: (params?: { page?: string; limit?: string; status?: string }) =>
    request<{
      documents: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/documents', { params }),

  /**
   * Busca detalhes de um documento
   */
  get: (documentId: string) =>
    request<unknown>(`/documents/${documentId}`),

  /**
   * Gera URL assinada para o PDF
   */
  getPdfUrl: (documentId: string, expiresIn?: string) =>
    request<{ url: string; expiresAt: string }>(`/documents/${documentId}/pdf-url`, {
      params: expiresIn ? { expiresIn } : undefined,
    }),

  /**
   * Busca resumo do documento
   */
  getSummary: (documentId: string) =>
    request<unknown>(`/documents/${documentId}/summary`),

  /**
   * Inicia processamento de um documento
   */
  process: (documentId: string, s3Key: string) =>
    request<{ message: string; documentId: string; status: string }>('/process', {
      method: 'POST',
      body: { documentId, s3Key },
    }),
};

// ============================================================================
// TIMELINE
// ============================================================================

export const timelineApi = {
  /**
   * Busca timeline completo
   */
  get: (documentId: string) =>
    request<unknown>(`/timeline/${documentId}`),

  /**
   * Busca eventos críticos
   */
  getCritical: (documentId: string, days?: string) =>
    request<unknown>(`/timeline/${documentId}/critical`, {
      params: days ? { days } : undefined,
    }),

  /**
   * Busca eventos por fase
   */
  getByPhase: (documentId: string) =>
    request<unknown>(`/timeline/${documentId}/by-phase`),

  /**
   * Busca detalhes de um evento
   */
  getEvent: (documentId: string, eventId: string) =>
    request<unknown>(`/timeline/${documentId}/events/${eventId}`),

  /**
   * Lista comentários de um evento
   */
  getComments: (documentId: string, eventId: string) =>
    request<unknown>(`/timeline/${documentId}/events/${eventId}/comments`),

  /**
   * Adiciona comentário
   */
  addComment: (documentId: string, eventId: string, content: string, author: string) =>
    request<unknown>(`/timeline/${documentId}/events/${eventId}/comments`, {
      method: 'POST',
      body: { content, author },
    }),

  /**
   * Atualiza comentário
   */
  updateComment: (documentId: string, eventId: string, commentId: string, content: string) =>
    request<unknown>(`/timeline/${documentId}/events/${eventId}/comments/${commentId}`, {
      method: 'PUT',
      body: { content },
    }),

  /**
   * Remove comentário
   */
  deleteComment: (documentId: string, eventId: string, commentId: string) =>
    request<{ success: boolean }>(`/timeline/${documentId}/events/${eventId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// STRUCTURE
// ============================================================================

export const structureApi = {
  /**
   * Busca árvore hierárquica
   */
  getTree: (documentId: string) =>
    request<unknown>(`/structure/${documentId}`),

  /**
   * Busca lista flat de seções
   */
  getFlat: (documentId: string, level?: string) =>
    request<unknown>(`/structure/${documentId}/flat`, {
      params: level ? { level } : undefined,
    }),

  /**
   * Busca detalhes de uma seção
   */
  getSection: (documentId: string, sectionId: string) =>
    request<unknown>(`/structure/${documentId}/sections/${sectionId}`),

  /**
   * Busca seções raiz
   */
  getRoot: (documentId: string) =>
    request<unknown>(`/structure/${documentId}/root`),

  /**
   * Busca filhos de uma seção
   */
  getChildren: (documentId: string, sectionId: string) =>
    request<unknown>(`/structure/${documentId}/sections/${sectionId}/children`),
};

// ============================================================================
// RISKS
// ============================================================================

export const risksApi = {
  /**
   * Lista riscos
   */
  list: (documentId: string, params?: { category?: string; severity?: string; sortBy?: string }) =>
    request<unknown>(`/risks/${documentId}`, { params }),

  /**
   * Busca riscos críticos
   */
  getCritical: (documentId: string) =>
    request<unknown>(`/risks/${documentId}/critical`),

  /**
   * Busca riscos por categoria
   */
  getByCategory: (documentId: string) =>
    request<unknown>(`/risks/${documentId}/by-category`),

  /**
   * Busca riscos que precisam de mitigação
   */
  getNeedingMitigation: (documentId: string) =>
    request<unknown>(`/risks/${documentId}/needing-mitigation`),

  /**
   * Busca detalhes de um risco
   */
  get: (documentId: string, riskId: string) =>
    request<unknown>(`/risks/${documentId}/${riskId}`),
};

// ============================================================================
// CHAT RAG
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourcePagesUsed?: number[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

export interface ChatResponse {
  messageId: string;
  conversationId: string;
  content: string;
  sourcePagesUsed: number[];
  sourceSnippets?: Array<{
    pageNumber: number;
    excerpt: string;
    similarity: number;
  }>;
}

export interface RagStatus {
  documentId: string;
  isReady: boolean;
  totalPages: number;
  embeddedPages: number;
  lastUpdated?: string;
}

export const chatApi = {
  /**
   * Envia mensagem e recebe resposta do assistente
   */
  sendMessage: (documentId: string, message: string, conversationId?: string, topK?: number) =>
    request<ChatResponse>(`/chat/${documentId}`, {
      method: 'POST',
      body: { message, conversationId, topK },
    }),

  /**
   * Lista conversas de um documento
   */
  listConversations: (documentId: string) =>
    request<{
      documentId: string;
      conversations: Conversation[];
      total: number;
    }>(`/chat/${documentId}`),

  /**
   * Cria uma nova conversa
   */
  createConversation: (documentId: string, title?: string) =>
    request<{ id: string; title: string; createdAt: string }>(`/chat/${documentId}/new`, {
      method: 'POST',
      body: { title },
    }),

  /**
   * Busca histórico de uma conversa
   */
  getConversation: (documentId: string, conversationId: string) =>
    request<{
      conversation: Conversation;
      messages: ChatMessage[];
    }>(`/chat/${documentId}/${conversationId}`),

  /**
   * Atualiza título de uma conversa
   */
  updateConversationTitle: (documentId: string, conversationId: string, title: string) =>
    request<{ success: boolean; title: string }>(`/chat/${documentId}/${conversationId}`, {
      method: 'PUT',
      body: { title },
    }),

  /**
   * Deleta uma conversa
   */
  deleteConversation: (documentId: string, conversationId: string) =>
    request<{ success: boolean; messagesDeleted: number }>(`/chat/${documentId}/${conversationId}`, {
      method: 'DELETE',
    }),

  /**
   * Prepara RAG (gera embeddings)
   */
  prepareRag: (documentId: string, regenerate?: boolean) =>
    request<{
      success: boolean;
      action: string;
      created: number;
      skipped?: number;
      deleted?: number;
      error?: string;
    }>(`/chat/${documentId}/rag/prepare`, {
      method: 'POST',
      body: { regenerate },
    }),

  /**
   * Verifica status do RAG
   */
  getRagStatus: (documentId: string) =>
    request<RagStatus>(`/chat/${documentId}/rag/status`),
};

// ============================================================================
// HEALTH
// ============================================================================

export const healthApi = {
  /**
   * Verifica saúde da Job API
   */
  check: () =>
    request<{ status: string; timestamp: string }>('/health'),
};

