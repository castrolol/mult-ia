import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { addJob } from '../services/queue.js';
import type { PDFDocument, ProcessJobData } from '../types/index.js';

const process = new Hono();

// Endpoint para iniciar processamento de um documento
process.post('/', async (c) => {
  try {
    const body = await c.req.json<ProcessJobData>();

    if (!body.documentId || !body.s3Key) {
      return c.json({ error: 'documentId e s3Key são obrigatórios' }, 400);
    }

    if (!ObjectId.isValid(body.documentId)) {
      return c.json({ error: 'documentId inválido' }, 400);
    }

    const db = getDatabase();
    const documentsCollection = db.collection<PDFDocument>('documents');

    // Verificar se o documento existe
    const document = await documentsCollection.findOne({ 
      _id: new ObjectId(body.documentId) 
    });

    if (!document) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    // Verificar se já está processando ou concluído
    if (document.status === 'PROCESSING') {
      return c.json({ 
        error: 'Documento já está em processamento',
        status: document.status 
      }, 409);
    }

    if (document.status === 'COMPLETED') {
      return c.json({ 
        message: 'Documento já foi processado',
        status: document.status 
      }, 200);
    }

    // Adicionar job na fila
    await addJob({
      documentId: body.documentId,
      s3Key: body.s3Key,
    });

    return c.json(
      {
        message: 'Processamento iniciado',
        documentId: body.documentId,
        status: 'PENDING',
      },
      202
    );
  } catch (error) {
    console.error('Erro ao iniciar processamento:', error);
    return c.json({ error: 'Erro interno ao iniciar processamento' }, 500);
  }
});

export { process };

