import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDatabase } from './database.js';
import { getEmbeddingService } from './embedding.js';
import { getChatService } from './chat.js';
import { getPageService } from './page.js';
import {
  RAG_CHAT_SYSTEM_PROMPT,
  createRagPrompt,
  NO_CONTEXT_PROMPT,
} from '../ai/prompts/chat.js';
import type {
  ChatResponse,
  RetrievedContext,
  RagStatus,
  SimilarityResult,
} from '../types/rag.js';
import type { PDFDocument } from '../types/index.js';
import { ObjectId } from 'mongodb';

/**
 * Limiar mínimo de similaridade para considerar uma página relevante
 */
const MIN_SIMILARITY_THRESHOLD = 0.3;

/**
 * Serviço RAG (Retrieval-Augmented Generation)
 * Integra embeddings, chat e geração de respostas
 */
export class RagService {
  private db = getDatabase();
  private embeddingService = getEmbeddingService();
  private chatService = getChatService();
  private pageService = getPageService();
  private documentsCollection = this.db.collection<PDFDocument>('documents');

  /**
   * Prepara um documento para RAG (gera embeddings)
   */
  async prepareDocument(documentId: string): Promise<{
    success: boolean;
    created: number;
    skipped: number;
    error?: string;
  }> {
    try {
      console.log(`\n🔄 Preparando documento ${documentId} para RAG...`);

      // Buscar páginas do documento
      const pages = await this.pageService.getPagesByDocumentId(documentId);

      if (pages.length === 0) {
        return {
          success: false,
          created: 0,
          skipped: 0,
          error: 'Documento não possui páginas processadas',
        };
      }

      // Gerar embeddings
      const result = await this.embeddingService.createDocumentEmbeddings(
        documentId,
        pages.map(p => ({
          id: p.id,
          pageNumber: p.pageNumber,
          text: p.text,
        }))
      );

      console.log(`   ✓ Embeddings criados: ${result.created}, ignorados: ${result.skipped}`);

      return {
        success: true,
        created: result.created,
        skipped: result.skipped,
      };
    } catch (error) {
      console.error(`   ✗ Erro ao preparar documento:`, error);
      return {
        success: false,
        created: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica o status do RAG para um documento
   */
  async getStatus(documentId: string): Promise<RagStatus> {
    // Buscar documento para saber total de páginas
    const doc = await this.documentsCollection.findOne({
      _id: new ObjectId(documentId),
    });

    const totalPages = doc?.totalPages || 0;

    return this.embeddingService.getRagStatus(documentId, totalPages);
  }

  /**
   * Recupera contexto relevante para uma query
   */
  async retrieveContext(
    documentId: string,
    query: string,
    topK: number = 5
  ): Promise<RetrievedContext> {
    const similarPages = await this.embeddingService.findSimilarPages(
      documentId,
      query,
      topK
    );

    // Filtrar páginas com similaridade muito baixa
    const relevantPages = similarPages.filter(
      p => p.similarity >= MIN_SIMILARITY_THRESHOLD
    );

    const combinedText = relevantPages
      .map(p => `[Página ${p.pageNumber}]\n${p.text}`)
      .join('\n\n---\n\n');

    return {
      pages: relevantPages,
      combinedText,
    };
  }

  /**
   * Processa uma mensagem do chat
   */
  async chat(
    documentId: string,
    message: string,
    conversationId?: string,
    topK: number = 5
  ): Promise<ChatResponse> {
    // Verificar se documento está pronto para RAG
    const status = await this.getStatus(documentId);
    if (!status.isReady) {
      throw new Error('Documento não está pronto para chat. Execute a preparação primeiro.');
    }

    // Criar ou recuperar conversa
    let conversation = conversationId
      ? await this.chatService.getConversation(conversationId)
      : null;

    if (!conversation) {
      const title = this.chatService.generateConversationTitle(message);
      conversation = await this.chatService.createConversation(documentId, title);
    }

    // Salvar mensagem do usuário
    await this.chatService.addMessage(
      documentId,
      conversation.id,
      'user',
      message
    );

    // Recuperar contexto relevante
    const context = await this.retrieveContext(documentId, message, topK);

    // Buscar histórico recente
    const recentMessages = await this.chatService.getRecentMessages(
      conversation.id,
      10
    );
    const formattedHistory = this.chatService.formatMessagesForModel(
      recentMessages.slice(0, -1) // Excluir a mensagem atual que já foi salva
    );

    // Gerar resposta
    let responseContent: string;
    const sourcePagesUsed = context.pages.map(p => p.pageNumber);

    if (context.pages.length === 0) {
      responseContent = NO_CONTEXT_PROMPT;
    } else {
      // Buscar nome do documento
      const doc = await this.documentsCollection.findOne({
        _id: new ObjectId(documentId),
      });

      const ragPrompt = createRagPrompt(
        message,
        context.pages.map(p => ({
          pageNumber: p.pageNumber,
          text: p.text,
          similarity: p.similarity,
        })),
        doc?.filename
      );

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: RAG_CHAT_SYSTEM_PROMPT,
        messages: [
          ...formattedHistory.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content: ragPrompt },
        ],
      });

      responseContent = text;
    }

    // Salvar resposta do assistente
    const assistantMessage = await this.chatService.addMessage(
      documentId,
      conversation.id,
      'assistant',
      responseContent,
      sourcePagesUsed
    );

    return {
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      content: responseContent,
      sourcePagesUsed,
      sourceSnippets: context.pages.map(p => ({
        pageNumber: p.pageNumber,
        excerpt: p.text.substring(0, 300) + (p.text.length > 300 ? '...' : ''),
        similarity: p.similarity,
      })),
    };
  }

  /**
   * Regenera embeddings de um documento
   */
  async regenerateEmbeddings(documentId: string): Promise<{
    deleted: number;
    created: number;
  }> {
    // Deletar embeddings existentes
    const deleted = await this.embeddingService.deleteDocumentEmbeddings(documentId);

    // Recriar embeddings
    const result = await this.prepareDocument(documentId);

    return {
      deleted,
      created: result.created,
    };
  }
}

// Singleton
let serviceInstance: RagService | null = null;

export function getRagService(): RagService {
  if (!serviceInstance) {
    serviceInstance = new RagService();
  }
  return serviceInstance;
}

