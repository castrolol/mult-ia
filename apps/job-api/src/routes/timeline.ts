import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { getTimelineService } from '../services/timeline.js';
import { getCommentsService } from '../services/comments.js';
import { getPhaseFromEventType, getSemanticOrder, PHASE_ORDER } from '../types/entities.js';
import type { PDFDocument, TimelineEvent } from '../types/index.js';

const timeline = new Hono();

/**
 * Agrupa eventos por categoria (com data, relativos resolvidos, avulsos)
 */
function categorizeEvents(events: TimelineEvent[]) {
  const withDate: TimelineEvent[] = [];
  const relativeResolved: TimelineEvent[] = [];
  const unresolved: TimelineEvent[] = [];

  for (const event of events) {
    if (event.date) {
      if (event.dateType === 'RELATIVE' && event.relativeTo) {
        relativeResolved.push(event);
      } else {
        withDate.push(event);
      }
    } else {
      unresolved.push(event);
    }
  }

  return { withDate, relativeResolved, unresolved };
}

/**
 * Ordena eventos por data e ordem semântica
 */
function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    // Primeiro por data
    if (a.date && b.date) {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
    }
    
    // Se mesma data ou sem data, ordenar por fase semântica
    const orderA = a.semanticOrder ?? getSemanticOrder(a.eventType);
    const orderB = b.semanticOrder ?? getSemanticOrder(b.eventType);
    
    return orderA - orderB;
  });
}

/**
 * GET /timeline/:documentId
 * Retorna a timeline completa do documento
 */
timeline.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    const timelineService = getTimelineService();
    
    // Verificar se documento existe
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Buscar todos os eventos
    const allEvents = await timelineService.getEventsByDocumentId(documentId);
    
    // Enriquecer com fase semântica
    const enrichedEvents = allEvents.map(event => ({
      ...event,
      phase: event.phase || getPhaseFromEventType(event.eventType),
      semanticOrder: event.semanticOrder ?? getSemanticOrder(event.eventType),
    }));
    
    // Categorizar eventos
    const { withDate, relativeResolved, unresolved } = categorizeEvents(enrichedEvents);
    
    // Ordenar cada categoria
    const sortedWithDate = sortEvents(withDate);
    const sortedRelative = sortEvents(relativeResolved);
    const sortedUnresolved = sortEvents(unresolved);
    
    // Estatísticas
    const stats = await timelineService.getTimelineStats(documentId);
    
    return c.json({
      documentId,
      
      // Timeline principal (eventos com data)
      timeline: sortedWithDate.map(formatEventForResponse),
      
      // Eventos com data relativa (já resolvidos)
      relativeEvents: sortedRelative.map(formatEventForResponse),
      
      // Eventos sem data definida
      unresolvedEvents: sortedUnresolved.map(formatEventForResponse),
      
      // Estatísticas
      stats: {
        total: allEvents.length,
        withDate: withDate.length,
        relative: relativeResolved.length,
        unresolved: unresolved.length,
        byImportance: stats.byImportance,
        upcomingCritical: stats.upcomingCritical,
        tags: stats.tags,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    return c.json({ error: 'Erro ao buscar timeline' }, 500);
  }
});

/**
 * GET /timeline/:documentId/critical
 * Retorna apenas eventos críticos/próximos
 */
timeline.get('/:documentId/critical', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const days = parseInt(c.req.query('days') || '30', 10);
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const timelineService = getTimelineService();
    
    // Buscar eventos críticos
    const events = await timelineService.getCriticalEvents(documentId);
    
    // Filtrar por dias se especificado
    const now = new Date();
    const filtered = events.filter(e => {
      if (!e.date) return e.importance === 'CRITICAL';
      const diffDays = Math.ceil((e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    });
    
    return c.json({
      documentId,
      daysAhead: days,
      events: sortEvents(filtered).map(formatEventForResponse),
      total: filtered.length,
    });
  } catch (error) {
    console.error('Erro ao buscar eventos críticos:', error);
    return c.json({ error: 'Erro ao buscar eventos críticos' }, 500);
  }
});

/**
 * GET /timeline/:documentId/by-phase
 * Retorna eventos agrupados por fase do processo
 */
timeline.get('/:documentId/by-phase', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const timelineService = getTimelineService();
    const events = await timelineService.getEventsByDocumentId(documentId);
    
    // Agrupar por fase
    const byPhase: Record<string, TimelineEvent[]> = {};
    
    for (const event of events) {
      const phase = event.phase || getPhaseFromEventType(event.eventType);
      if (!byPhase[phase]) {
        byPhase[phase] = [];
      }
      byPhase[phase].push(event);
    }
    
    // Ordenar fases e eventos dentro de cada fase
    const sortedPhases = Object.entries(byPhase)
      .sort(([a], [b]) => (PHASE_ORDER[a as keyof typeof PHASE_ORDER] || 99) - (PHASE_ORDER[b as keyof typeof PHASE_ORDER] || 99))
      .map(([phase, phaseEvents]) => ({
        phase,
        order: PHASE_ORDER[phase as keyof typeof PHASE_ORDER] || 99,
        events: sortEvents(phaseEvents).map(formatEventForResponse),
        count: phaseEvents.length,
      }));
    
    return c.json({
      documentId,
      phases: sortedPhases,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error('Erro ao buscar por fase:', error);
    return c.json({ error: 'Erro ao buscar por fase' }, 500);
  }
});

/**
 * GET /timeline/:documentId/events/:eventId
 * Retorna detalhes de um evento específico
 */
timeline.get('/:documentId/events/:eventId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');
    
    const timelineService = getTimelineService();
    const commentsService = getCommentsService();
    
    const event = await timelineService.getEventById(eventId);
    
    if (!event || event.documentId !== documentId) {
      return c.json({ error: 'Evento não encontrado' }, 404);
    }
    
    // Buscar comentários
    const comments = await commentsService.getCommentsByEventId(eventId);
    
    return c.json({
      ...formatEventForResponse(event),
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
    });
  } catch (error) {
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
    const eventId = c.req.param('eventId');
    
    const commentsService = getCommentsService();
    const comments = await commentsService.getCommentsByEventId(eventId);
    
    return c.json({
      eventId,
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
      total: comments.length,
    });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    return c.json({ error: 'Erro ao listar comentários' }, 500);
  }
});

/**
 * POST /timeline/:documentId/events/:eventId/comments
 * Adiciona um comentário a um evento
 */
timeline.post('/:documentId/events/:eventId/comments', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const eventId = c.req.param('eventId');
    
    const body = await c.req.json<{ content: string; author: string }>();
    
    if (!body.content || !body.author) {
      return c.json({ error: 'content e author são obrigatórios' }, 400);
    }
    
    const timelineService = getTimelineService();
    const commentsService = getCommentsService();
    
    // Verificar se evento existe
    const event = await timelineService.getEventById(eventId);
    if (!event || event.documentId !== documentId) {
      return c.json({ error: 'Evento não encontrado' }, 404);
    }
    
    // Criar comentário
    const comment = await commentsService.createComment({
      timelineEventId: eventId,
      documentId,
      content: body.content,
      author: body.author,
    });
    
    return c.json({
      id: comment.id,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt,
    }, 201);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return c.json({ error: 'Erro ao criar comentário' }, 500);
  }
});

/**
 * PUT /timeline/:documentId/events/:eventId/comments/:commentId
 * Atualiza um comentário
 */
timeline.put('/:documentId/events/:eventId/comments/:commentId', async (c) => {
  try {
    const commentId = c.req.param('commentId');
    
    const body = await c.req.json<{ content: string }>();
    
    if (!body.content) {
      return c.json({ error: 'content é obrigatório' }, 400);
    }
    
    const commentsService = getCommentsService();
    
    const updated = await commentsService.updateComment(commentId, body.content);
    
    if (!updated) {
      return c.json({ error: 'Comentário não encontrado' }, 404);
    }
    
    return c.json({
      id: updated.id,
      content: updated.content,
      author: updated.author,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
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
    const commentId = c.req.param('commentId');
    
    const commentsService = getCommentsService();
    
    const deleted = await commentsService.deleteComment(commentId);
    
    if (!deleted) {
      return c.json({ error: 'Comentário não encontrado' }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover comentário:', error);
    return c.json({ error: 'Erro ao remover comentário' }, 500);
  }
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formata um evento para resposta da API
 */
function formatEventForResponse(event: TimelineEvent) {
  return {
    id: event.id,
    date: event.date,
    dateRaw: event.dateRaw,
    dateType: event.dateType,
    relativeTo: event.relativeTo,
    eventType: event.eventType,
    phase: event.phase || getPhaseFromEventType(event.eventType),
    semanticOrder: event.semanticOrder ?? getSemanticOrder(event.eventType),
    title: event.title,
    description: event.description,
    importance: event.importance,
    actionRequired: event.actionRequired,
    linkedPenalties: event.linkedPenalties,
    linkedRequirements: event.linkedRequirements,
    linkedObligations: event.linkedObligations,
    linkedRiskIds: event.linkedRiskIds,
    urgency: event.urgency,
    tags: event.tags,
    sourcePages: event.sourcePages,
    commentsCount: event.commentsCount || 0,
    createdAt: event.createdAt,
  };
}

export { timeline };

