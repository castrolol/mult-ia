import type { ObjectId } from 'mongodb';

// ============================================================================
// EMBEDDINGS
// ============================================================================

/**
 * Embedding de uma página do documento para RAG
 */
export interface DocumentEmbedding {
  _id?: ObjectId;
  
  /** ID do documento */
  documentId: string;
  
  /** ID da página */
  pageId: string;
  
  /** Número da página */
  pageNumber: number;
  
  /** Texto da página (para referência) */
  text: string;
  
  /** Vetor de embedding (1536 dimensões para text-embedding-3-small) */
  embedding: number[];
  
  /** Data de criação */
  createdAt: Date;
}

/**
 * Status do RAG para um documento
 */
export interface RagStatus {
  documentId: string;
  isReady: boolean;
  totalPages: number;
  embeddedPages: number;
  lastUpdated?: Date;
}

/**
 * Resultado de busca por similaridade
 */
export interface SimilarityResult {
  pageId: string;
  pageNumber: number;
  text: string;
  similarity: number;
}

// ============================================================================
// CHAT / CONVERSATIONS
// ============================================================================

/**
 * Role de uma mensagem no chat
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Mensagem de chat
 */
export interface ChatMessage {
  _id?: ObjectId;
  
  /** ID único da mensagem */
  id: string;
  
  /** ID do documento relacionado */
  documentId: string;
  
  /** ID da conversa */
  conversationId: string;
  
  /** Role da mensagem */
  role: ChatRole;
  
  /** Conteúdo da mensagem */
  content: string;
  
  /** Páginas usadas como contexto (apenas para assistant) */
  sourcePagesUsed?: number[];
  
  /** Data de criação */
  createdAt: Date;
}

/**
 * Conversa (agrupamento de mensagens)
 */
export interface Conversation {
  _id?: ObjectId;
  
  /** ID único da conversa */
  id: string;
  
  /** ID do documento relacionado */
  documentId: string;
  
  /** Título da conversa (gerado automaticamente ou definido pelo usuário) */
  title: string;
  
  /** Data de criação */
  createdAt: Date;
  
  /** Data da última mensagem */
  lastMessageAt: Date;
  
  /** Quantidade de mensagens */
  messageCount: number;
}

/**
 * Request para enviar mensagem no chat
 */
export interface ChatRequest {
  /** Mensagem do usuário */
  message: string;
  
  /** ID da conversa (opcional, cria nova se não informado) */
  conversationId?: string;
  
  /** Quantidade de páginas a recuperar para contexto */
  topK?: number;
}

/**
 * Response do chat
 */
export interface ChatResponse {
  /** ID da mensagem */
  messageId: string;
  
  /** ID da conversa */
  conversationId: string;
  
  /** Resposta do assistente */
  content: string;
  
  /** Páginas usadas como contexto */
  sourcePagesUsed: number[];
  
  /** Snippets relevantes das páginas */
  sourceSnippets?: Array<{
    pageNumber: number;
    excerpt: string;
    similarity: number;
  }>;
}

/**
 * Contexto recuperado para RAG
 */
export interface RetrievedContext {
  pages: SimilarityResult[];
  combinedText: string;
}

/**
 * Histórico formatado para o modelo
 */
export interface FormattedHistory {
  role: 'user' | 'assistant';
  content: string;
}

