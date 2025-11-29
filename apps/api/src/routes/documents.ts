import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import type { PDFDocument } from '../types/index.js';

const documents = new Hono();

// Endpoint para verificar status do documento
documents.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!ObjectId.isValid(id)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const db = getDatabase();
    const document = await db
      .collection<PDFDocument>('documents')
      .findOne({ _id: new ObjectId(id) });

    if (!document) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }

    return c.json({
      documentId: document._id?.toString(),
      filename: document.filename,
      status: document.status,
      totalPages: document.totalPages,
      error: document.error,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    return c.json({ error: 'Erro interno' }, 500);
  }
});

// Listar todos os documentos (opcional, útil para o frontend)
documents.get('/', async (c) => {
  try {
    const db = getDatabase();
    const documentsList = await db
      .collection<PDFDocument>('documents')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return c.json({
      documents: documentsList.map((doc) => ({
        documentId: doc._id?.toString(),
        filename: doc.filename,
        status: doc.status,
        totalPages: doc.totalPages,
        error: doc.error,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    return c.json({ error: 'Erro interno' }, 500);
  }
});

export { documents };

