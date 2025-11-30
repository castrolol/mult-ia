import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { documentsApi, JobApiError } from '../services/job-api-client.js';
import type { PDFDocument } from '../types/index.js';

const documents = new Hono();

// ============================================================================
// ROTAS LOCAIS (acesso direto ao MongoDB)
// ============================================================================

/**
 * GET /documents
 * Lista documentos com status de processamento
 * Usa job-api para dados enriquecidos
 */
documents.get('/', async (c) => {
  try {
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const status = c.req.query('status');

    const result = await documentsApi.list({ page, limit, status });
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao listar documentos:', error);
    return c.json({ error: 'Erro ao listar documentos' }, 500);
  }
});

/**
 * GET /documents/:id
 * Retorna detalhes completos do documento
 */
documents.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await documentsApi.get(id);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar documento:', error);
    return c.json({ error: 'Erro ao buscar documento' }, 500);
  }
});

/**
 * GET /documents/:id/pdf-url
 * Gera URL assinada para visualizar o PDF
 */
documents.get('/:id/pdf-url', async (c) => {
  try {
    const id = c.req.param('id');
    const expiresIn = c.req.query('expiresIn');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await documentsApi.getPdfUrl(id, expiresIn);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao gerar URL:', error);
    return c.json({ error: 'Erro ao gerar URL' }, 500);
  }
});

/**
 * GET /documents/:id/summary
 * Retorna resumo rápido do documento
 */
documents.get('/:id/summary', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const result = await documentsApi.getSummary(id);
    return c.json(result);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao buscar resumo:', error);
    return c.json({ error: 'Erro ao buscar resumo' }, 500);
  }
});

/**
 * POST /documents/:id/process
 * Inicia processamento de um documento
 */
documents.post('/:id/process', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    // Buscar documento para obter s3Key
    const db = getDatabase();
    const document = await db
      .collection<PDFDocument>('documents')
      .findOne({ _id: new ObjectId(id) });

    if (!document) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    // Iniciar processamento na job-api
    const result = await documentsApi.process(id, document.s3Key);
    return c.json(result, 202);
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao processar documento:', error);
    return c.json({ error: 'Erro ao processar documento' }, 500);
  }
});

export { documents };
