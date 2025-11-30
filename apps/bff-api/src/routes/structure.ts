import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { structureApi, JobApiError } from '../services/job-api-client.js';

const structure = new Hono();

/**
 * GET /structure/:documentId
 * Retorna árvore hierárquica completa do documento
 */
structure.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await structureApi.getTree(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar estrutura:', error);
    return c.json({ error: 'Erro ao buscar estrutura' }, 500);
  }
});

/**
 * GET /structure/:documentId/flat
 * Retorna seções em formato de lista
 */
structure.get('/:documentId/flat', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const level = c.req.query('level');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await structureApi.getFlat(documentId, level);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar estrutura flat:', error);
    return c.json({ error: 'Erro ao buscar estrutura' }, 500);
  }
});

/**
 * GET /structure/:documentId/root
 * Retorna apenas seções raiz
 */
structure.get('/:documentId/root', async (c) => {
  try {
    const documentId = c.req.param('documentId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await structureApi.getRoot(documentId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar raízes:', error);
    return c.json({ error: 'Erro ao buscar raízes' }, 500);
  }
});

/**
 * GET /structure/:documentId/sections/:sectionId
 * Retorna detalhes de uma seção
 */
structure.get('/:documentId/sections/:sectionId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const sectionId = c.req.param('sectionId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await structureApi.getSection(documentId, sectionId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar seção:', error);
    return c.json({ error: 'Erro ao buscar seção' }, 500);
  }
});

/**
 * GET /structure/:documentId/sections/:sectionId/children
 * Retorna filhos de uma seção
 */
structure.get('/:documentId/sections/:sectionId/children', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const sectionId = c.req.param('sectionId');

    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await structureApi.getChildren(documentId, sectionId);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar filhos:', error);
    return c.json({ error: 'Erro ao buscar filhos' }, 500);
  }
});

export { structure };

