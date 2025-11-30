import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { risksApi, JobApiError } from '../services/job-api-client.js';

const risks = new Hono();

/**
 * GET /risks/:documentId
 * Lista todos os riscos de um documento
 */
risks.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const category = c.req.query('category');
    const severity = c.req.query('severity');
    const sortBy = c.req.query('sortBy');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await risksApi.list(documentId, { category, severity, sortBy });
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao listar riscos:', error);
    return c.json({ error: 'Erro ao listar riscos' }, 500);
  }
});

/**
 * GET /risks/:documentId/critical
 * Lista riscos críticos
 */
risks.get('/:documentId/critical', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await risksApi.getCritical(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar riscos críticos:', error);
    return c.json({ error: 'Erro ao buscar riscos críticos' }, 500);
  }
});

/**
 * GET /risks/:documentId/by-category
 * Lista riscos agrupados por categoria
 */
risks.get('/:documentId/by-category', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await risksApi.getByCategory(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao agrupar por categoria:', error);
    return c.json({ error: 'Erro ao agrupar por categoria' }, 500);
  }
});

/**
 * GET /risks/:documentId/needing-mitigation
 * Lista riscos que precisam de mitigação
 */
risks.get('/:documentId/needing-mitigation', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await risksApi.getNeedingMitigation(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar riscos sem mitigação:', error);
    return c.json({ error: 'Erro ao buscar riscos sem mitigação' }, 500);
  }
});

/**
 * GET /risks/:documentId/:riskId
 * Retorna detalhes de um risco
 */
risks.get('/:documentId/:riskId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const riskId = c.req.param('riskId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await risksApi.get(documentId, riskId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar risco:', error);
    return c.json({ error: 'Erro ao buscar risco' }, 500);
  }
});

export { risks };

