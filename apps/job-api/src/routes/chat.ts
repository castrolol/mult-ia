import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { getRagService } from '../services/rag.js';
import { getChatService } from '../services/chat.js';
import type { PDFDocument } from '../types/index.js';
import type { ChatRequest } from '../types/rag.js';

const chat = new Hono();

/**
 * POST /chat/:documentId
 * Envia uma mensagem e recebe resposta do assistente
 */
chat.post('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    // Verificar se documento existe
    const db = getDatabase();
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });

    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    const body = await c.req.json<ChatRequest>();

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ error: 'Mensagem é obrigatória' }, 400);
    }

    const ragService = getRagService();

    const response = await ragService.chat(
      documentId,
      body.message,
      body.conversationId,
      body.topK || 5
    );

    return c.json(response);
  } catch (error) {
    console.error('Erro no chat:', error);
    
    if (error instanceof Error && error.message.includes('não está pronto')) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Erro ao processar mensagem' }, 500);
  }
});

/**
 * GET /chat/:documentId
 * Lista todas as conversas de um documento
 */
chat.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    const chatService = getChatService();
    const conversations = await chatService.listConversations(documentId);

    return c.json({
      documentId,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messageCount,
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
      })),
      total: conversations.length,
    });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return c.json({ error: 'Erro ao listar conversas' }, 500);
  }
});

/**
 * POST /chat/:documentId/new
 * Cria uma nova conversa
 */
chat.post('/:documentId/new', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    // Verificar se documento existe
    const db = getDatabase();
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });

    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    const body = await c.req.json<{ title?: string }>().catch(() => ({}));

    const chatService = getChatService();
    const conversation = await chatService.createConversation(documentId, body.title);

    return c.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    }, 201);
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    return c.json({ error: 'Erro ao criar conversa' }, 500);
  }
});

/**
 * GET /chat/:documentId/:conversationId
 * Retorna o histórico de uma conversa
 */
chat.get('/:documentId/:conversationId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const conversationId = c.req.param('conversationId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    const chatService = getChatService();
    
    // Verificar se conversa existe
    const conversation = await chatService.getConversation(conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversa não encontrada' }, 404);
    }

    if (conversation.documentId !== documentId) {
      return c.json({ error: 'Conversa não pertence a este documento' }, 400);
    }

    const messages = await chatService.getConversationMessages(conversationId);

    return c.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: conversation.messageCount,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sourcePagesUsed: msg.sourcePagesUsed,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return c.json({ error: 'Erro ao buscar conversa' }, 500);
  }
});

/**
 * PATCH /chat/:documentId/:conversationId
 * Atualiza o título de uma conversa
 */
chat.patch('/:documentId/:conversationId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const conversationId = c.req.param('conversationId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    const body = await c.req.json<{ title: string }>();

    if (!body.title || typeof body.title !== 'string') {
      return c.json({ error: 'Título é obrigatório' }, 400);
    }

    const chatService = getChatService();
    
    // Verificar se conversa existe
    const conversation = await chatService.getConversation(conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversa não encontrada' }, 404);
    }

    if (conversation.documentId !== documentId) {
      return c.json({ error: 'Conversa não pertence a este documento' }, 400);
    }

    await chatService.updateConversationTitle(conversationId, body.title);

    return c.json({ success: true, title: body.title });
  } catch (error) {
    console.error('Erro ao atualizar conversa:', error);
    return c.json({ error: 'Erro ao atualizar conversa' }, 500);
  }
});

/**
 * DELETE /chat/:documentId/:conversationId
 * Deleta uma conversa e suas mensagens
 */
chat.delete('/:documentId/:conversationId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const conversationId = c.req.param('conversationId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    const chatService = getChatService();
    
    // Verificar se conversa existe
    const conversation = await chatService.getConversation(conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversa não encontrada' }, 404);
    }

    if (conversation.documentId !== documentId) {
      return c.json({ error: 'Conversa não pertence a este documento' }, 400);
    }

    const result = await chatService.deleteConversation(conversationId);

    return c.json({
      success: true,
      messagesDeleted: result.messagesDeleted,
    });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    return c.json({ error: 'Erro ao deletar conversa' }, 500);
  }
});

/**
 * POST /chat/:documentId/rag/prepare
 * Força a preparação/regeneração dos embeddings do documento
 */
chat.post('/:documentId/rag/prepare', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    // Verificar se documento existe
    const db = getDatabase();
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });

    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    if (doc.status !== 'COMPLETED') {
      return c.json({ 
        error: 'Documento ainda não foi processado completamente',
        status: doc.status,
      }, 400);
    }

    const ragService = getRagService();
    const body = await c.req.json<{ regenerate?: boolean }>().catch(() => ({}));

    let result;
    if (body.regenerate) {
      result = await ragService.regenerateEmbeddings(documentId);
      return c.json({
        success: true,
        action: 'regenerated',
        deleted: result.deleted,
        created: result.created,
      });
    } else {
      result = await ragService.prepareDocument(documentId);
      return c.json({
        success: result.success,
        action: 'prepared',
        created: result.created,
        skipped: result.skipped,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Erro ao preparar RAG:', error);
    return c.json({ error: 'Erro ao preparar documento para RAG' }, 500);
  }
});

/**
 * GET /chat/:documentId/rag/status
 * Retorna o status do RAG para um documento
 */
chat.get('/:documentId/rag/status', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID de documento inválido' }, 400);
    }

    const ragService = getRagService();
    const status = await ragService.getStatus(documentId);

    return c.json(status);
  } catch (error) {
    console.error('Erro ao buscar status RAG:', error);
    return c.json({ error: 'Erro ao buscar status' }, 500);
  }
});

export { chat };

