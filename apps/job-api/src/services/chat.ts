import crypto from 'crypto';
import { getDatabase } from './database.js';
import type { ChatMessage, Conversation, FormattedHistory } from '../types/rag.js';

/**
 * Gera um ID único
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Serviço para gerenciar conversas e mensagens de chat
 */
export class ChatService {
  private db = getDatabase();
  private messagesCollection = this.db.collection<ChatMessage>('chat_messages');
  private conversationsCollection = this.db.collection<Conversation>('chat_conversations');

  /**
   * Cria uma nova conversa
   */
  async createConversation(documentId: string, title?: string): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: generateId(),
      documentId,
      title: title || `Conversa ${now.toLocaleDateString('pt-BR')}`,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
    };

    await this.conversationsCollection.insertOne(conversation);
    return conversation;
  }

  /**
   * Busca uma conversa por ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversationsCollection.findOne({ id: conversationId });
  }

  /**
   * Lista conversas de um documento
   */
  async listConversations(documentId: string): Promise<Conversation[]> {
    return this.conversationsCollection
      .find({ documentId })
      .sort({ lastMessageAt: -1 })
      .toArray();
  }

  /**
   * Atualiza o título de uma conversa
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    await this.conversationsCollection.updateOne(
      { id: conversationId },
      { $set: { title } }
    );
  }

  /**
   * Deleta uma conversa e suas mensagens
   */
  async deleteConversation(conversationId: string): Promise<{ messagesDeleted: number }> {
    const result = await this.messagesCollection.deleteMany({ conversationId });
    await this.conversationsCollection.deleteOne({ id: conversationId });
    return { messagesDeleted: result.deletedCount };
  }

  /**
   * Adiciona uma mensagem à conversa
   */
  async addMessage(
    documentId: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sourcePagesUsed?: number[]
  ): Promise<ChatMessage> {
    const now = new Date();
    const message: ChatMessage = {
      id: generateId(),
      documentId,
      conversationId,
      role,
      content,
      sourcePagesUsed,
      createdAt: now,
    };

    await this.messagesCollection.insertOne(message);

    // Atualizar conversa
    await this.conversationsCollection.updateOne(
      { id: conversationId },
      {
        $set: { lastMessageAt: now },
        $inc: { messageCount: 1 },
      }
    );

    return message;
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.messagesCollection
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();
  }

  /**
   * Busca as últimas N mensagens de uma conversa (para contexto)
   */
  async getRecentMessages(conversationId: string, limit: number = 10): Promise<ChatMessage[]> {
    const messages = await this.messagesCollection
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Retornar na ordem cronológica
    return messages.reverse();
  }

  /**
   * Formata mensagens para enviar ao modelo
   */
  formatMessagesForModel(messages: ChatMessage[]): FormattedHistory[] {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  /**
   * Gera um título automático para a conversa baseado na primeira mensagem
   */
  generateConversationTitle(firstMessage: string): string {
    // Pegar as primeiras palavras da mensagem
    const words = firstMessage.trim().split(/\s+/).slice(0, 6);
    let title = words.join(' ');
    
    if (firstMessage.length > title.length) {
      title += '...';
    }

    return title.substring(0, 50);
  }

  /**
   * Conta mensagens de uma conversa
   */
  async countMessages(conversationId: string): Promise<number> {
    return this.messagesCollection.countDocuments({ conversationId });
  }

  /**
   * Deleta todas as conversas e mensagens de um documento
   */
  async deleteDocumentConversations(documentId: string): Promise<{
    conversationsDeleted: number;
    messagesDeleted: number;
  }> {
    const messagesResult = await this.messagesCollection.deleteMany({ documentId });
    const conversationsResult = await this.conversationsCollection.deleteMany({ documentId });
    
    return {
      conversationsDeleted: conversationsResult.deletedCount,
      messagesDeleted: messagesResult.deletedCount,
    };
  }
}

// Singleton
let serviceInstance: ChatService | null = null;

export function getChatService(): ChatService {
  if (!serviceInstance) {
    serviceInstance = new ChatService();
  }
  return serviceInstance;
}

