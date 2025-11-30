import { Hono } from 'hono';
import { chatApi } from '../services/job-api-client.js';

const chat = new Hono();

/**
 * POST /chat/:documentId
 * Envia mensagem e recebe resposta do assistente
 */
chat.post('/:documentId', async (c) => {
  const documentId = c.req.param('documentId');
  const body = await c.req.json<{
    message: string;
    conversationId?: string;
    topK?: number;
  }>();

  const result = await chatApi.sendMessage(
    documentId,
    body.message,
    body.conversationId,
    body.topK
  );

  return c.json(result);
});

/**
 * GET /chat/:documentId
 * Lista conversas de um documento
 */
chat.get('/:documentId', async (c) => {
  const documentId = c.req.param('documentId');
  const result = await chatApi.listConversations(documentId);
  return c.json(result);
});

/**
 * POST /chat/:documentId/new
 * Cria uma nova conversa
 */
chat.post('/:documentId/new', async (c) => {
  const documentId = c.req.param('documentId');
  const body = await c.req.json<{ title?: string }>().catch(() => ({}));
  const result = await chatApi.createConversation(documentId, body.title);
  return c.json(result, 201);
});

/**
 * GET /chat/:documentId/rag/status
 * Verifica status do RAG
 */
chat.get('/:documentId/rag/status', async (c) => {
  const documentId = c.req.param('documentId');
  const result = await chatApi.getRagStatus(documentId);
  return c.json(result);
});

/**
 * POST /chat/:documentId/rag/prepare
 * Prepara RAG (gera embeddings)
 */
chat.post('/:documentId/rag/prepare', async (c) => {
  const documentId = c.req.param('documentId');
  const body = await c.req.json<{ regenerate?: boolean }>().catch(() => ({}));
  const result = await chatApi.prepareRag(documentId, body.regenerate);
  return c.json(result);
});

/**
 * GET /chat/:documentId/:conversationId
 * Busca histórico de uma conversa
 */
chat.get('/:documentId/:conversationId', async (c) => {
  const documentId = c.req.param('documentId');
  const conversationId = c.req.param('conversationId');
  const result = await chatApi.getConversation(documentId, conversationId);
  return c.json(result);
});

/**
 * PUT /chat/:documentId/:conversationId
 * Atualiza título de uma conversa
 */
chat.put('/:documentId/:conversationId', async (c) => {
  const documentId = c.req.param('documentId');
  const conversationId = c.req.param('conversationId');
  const body = await c.req.json<{ title: string }>();
  const result = await chatApi.updateConversationTitle(documentId, conversationId, body.title);
  return c.json(result);
});

/**
 * DELETE /chat/:documentId/:conversationId
 * Deleta uma conversa
 */
chat.delete('/:documentId/:conversationId', async (c) => {
  const documentId = c.req.param('documentId');
  const conversationId = c.req.param('conversationId');
  const result = await chatApi.deleteConversation(documentId, conversationId);
  return c.json(result);
});

export { chat };

