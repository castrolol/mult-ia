import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { IncomingMessage } from 'http';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { getDatabase } from '../services/database.js';
import { uploadFile } from '../services/storage.js';
import { addJob } from '../services/queue.js';
import type { PDFDocument } from '../types/index.js';

const upload = new Hono();

// Helper para extrair o request nativo do Node.js
function getNodeRequest(c: any): IncomingMessage | null {
  // @hono/node-server expõe o request original via env
  return c.env?.incoming ?? null;
}

// Parser de FormData usando formidable
async function parseFormData(
  req: IncomingMessage
): Promise<{ file: formidable.File | null }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const fileArray = files['file'];
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      resolve({ file: file ?? null });
    });
  });
}

upload.post('/', async (c) => {
  try {
    const nodeReq = getNodeRequest(c);

    if (!nodeReq) {
      return c.json({ error: 'Requisição inválida' }, 400);
    }

    const { file } = await parseFormData(nodeReq);

    if (!file) {
      return c.json({ error: 'Arquivo PDF é obrigatório' }, 400);
    }

    if (file.mimetype !== 'application/pdf') {
      return c.json({ error: 'Apenas arquivos PDF são aceitos' }, 400);
    }

    const db = getDatabase();
    const documentsCollection = db.collection<PDFDocument>('documents');

    // Gerar key única para o S3
    const documentId = new ObjectId();
    const filename = file.originalFilename || 'document.pdf';
    const s3Key = `uploads/${documentId.toString()}/${filename}`;

    // 1. Ler o arquivo do disco temporário e fazer upload para Minio
    const buffer = await readFile(file.filepath);
    await uploadFile(s3Key, buffer, file.mimetype || 'application/pdf');

    // 2. Salvar registro no MongoDB
    const document: PDFDocument = {
      _id: documentId,
      filename,
      s3Key,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await documentsCollection.insertOne(document);

    // 3. Adicionar job na fila
    await addJob({
      documentId: documentId.toString(),
      s3Key,
    });

    // 4. Retornar 202 Accepted
    return c.json(
      {
        message: 'Documento recebido e em processamento',
        documentId: documentId.toString(),
        filename,
        status: 'PENDING',
      },
      202
    );
  } catch (error) {
    console.error('Erro no upload:', error);
    return c.json({ error: 'Erro interno ao processar upload' }, 500);
  }
});

// Endpoint para verificar status do documento
upload.get('/:id', async (c) => {
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

export { upload };
