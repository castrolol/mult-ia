import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { documentsApi, JobApiError } from '../services/job-api-client.js';
import { downloadFile } from '../services/storage.js';
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
 * Retorna URL do proxy do BFF para o PDF
 * (O MinIO pode não ser acessível externamente)
 */
documents.get('/:id/pdf-url', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    // Retornar URL do proxy do BFF em vez da URL do MinIO
    const protocol = c.req.header('x-forwarded-proto') || 'http';
    const host = c.req.header('host') || 'localhost:3001';
    const proxyUrl = `${protocol}://${host}/documents/${id}/pdf`;
    
    // URL não expira pois é servida pelo BFF
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    return c.json({ url: proxyUrl, expiresAt });
  } catch (error) {
    console.error('Erro ao gerar URL:', error);
    return c.json({ error: 'Erro ao gerar URL' }, 500);
  }
});

/**
 * OPTIONS /documents/:id/pdf
 * Preflight para CORS
 */
documents.options('/:id/pdf', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
});

/**
 * GET /documents/:id/pdf
 * Proxy para servir o PDF diretamente via SDK do S3
 * Resolve problema de CORS do MinIO não configurado
 */
documents.get('/:id/pdf', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    // Buscar documento para obter s3Key e filename
    const db = getDatabase();
    const document = await db
      .collection<PDFDocument>('documents')
      .findOne({ _id: new ObjectId(id) });
    
    if (!document) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    if (!document.s3Key) {
      return c.json({ error: 'Documento sem arquivo associado' }, 404);
    }

    // Baixar o PDF diretamente do MinIO via SDK (sem problemas de CORS)
    const pdfBuffer = await downloadFile(document.s3Key);
    
    const filename = document.filename || 'document.pdf';
    
    // Servir o PDF com headers CORS adequados para iframe
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Headers para permitir embedding em iframe cross-origin
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (error) {
    if (error instanceof JobApiError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error('Erro ao servir PDF:', error);
    return c.json({ error: 'Erro ao servir PDF' }, 500);
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
