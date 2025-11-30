import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { timelineApi, JobApiError } from '../services/job-api-client.js';

const timeline = new Hono();

/**
 * GET /timeline/:documentId
 * Retorna timeline completo do documento
 */
timeline.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await timelineApi.get(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar timeline:', error);
    return c.json({ error: 'Erro ao buscar timeline' }, 500);
  }
});

/**
 * GET /timeline/:documentId/critical
 * Retorna eventos críticos
 */
timeline.get('/:documentId/critical', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const days = c.req.query('days');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await timelineApi.getCritical(documentId, days);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar eventos críticos:', error);
    return c.json({ error: 'Erro ao buscar eventos críticos' }, 500);
  }
});

/**
 * GET /timeline/:documentId/by-phase
 * Retorna eventos agrupados por fase
 */
timeline.get('/:documentId/by-phase', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await timelineApi.getByPhase(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar por fase:', error);
    return c.json({ error: 'Erro ao buscar por fase' }, 500);
  }
});

/**
 * GET /timeline/:documentId/events/:eventId
 * Retorna detalhes de um evento
 */
timeline.get('/:documentId/events/:eventId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await timelineApi.getEvent(documentId, eventId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar evento:', error);
    return c.json({ error: 'Erro ao buscar evento' }, 500);
  }
});

// ============================================================================
// COMENTÁRIOS
// ============================================================================

/**
 * GET /timeline/:documentId/events/:eventId/comments
 * Lista comentários de um evento
 */
timeline.get('/:documentId/events/:eventId/comments', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');

    const result = await timelineApi.getComments(documentId, eventId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao listar comentários:', error);
    return c.json({ error: 'Erro ao listar comentários' }, 500);
  }
});

/**
 * POST /timeline/:documentId/events/:eventId/comments
 * Adiciona comentário a um evento
 */
timeline.post('/:documentId/events/:eventId/comments', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');
    const body = await c.req.json<{ content: string; author: string }>();

    if (!body.content || !body.author) {
      return c.json({ error: 'content e author são obrigatórios' }, 400);
    }

    const result = await timelineApi.addComment(documentId, eventId, body.content, body.author);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao adicionar comentário:', error);
    return c.json({ error: 'Erro ao adicionar comentário' }, 500);
  }
});

/**
 * PUT /timeline/:documentId/events/:eventId/comments/:commentId
 * Atualiza um comentário
 */
timeline.put('/:documentId/events/:eventId/comments/:commentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');
    const commentId = c.req.param('commentId');
    const body = await c.req.json<{ content: string }>();

    if (!body.content) {
      return c.json({ error: 'content é obrigatório' }, 400);
    }

    const result = await timelineApi.updateComment(documentId, eventId, commentId, body.content);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao atualizar comentário:', error);
    return c.json({ error: 'Erro ao atualizar comentário' }, 500);
  }
});

/**
 * DELETE /timeline/:documentId/events/:eventId/comments/:commentId
 * Remove um comentário
 */
timeline.delete('/:documentId/events/:eventId/comments/:commentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');
    const commentId = c.req.param('commentId');

    const result = await timelineApi.deleteComment(documentId, eventId, commentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao remover comentário:', error);
    return c.json({ error: 'Erro ao remover comentário' }, 500);
  }
});

export { timeline };

