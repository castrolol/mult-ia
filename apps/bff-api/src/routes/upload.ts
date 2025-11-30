import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { IncomingMessage } from 'http';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { getDatabase } from '../services/database.js';
import { uploadFile } from '../services/storage.js';
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

// Notificar job-api para processar o documento
async function notifyJobApi(documentId: string, s3Key: string): Promise<void> {
  const jobApiUrl = process.env.JOB_API_URL || 'http://localhost:3001';

  const response = await fetch(`${jobApiUrl}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, s3Key }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao notificar job-api: ${response.status} - ${errorText}`);
  }
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

    // 3. Notificar job-api para processar
    try {
      await notifyJobApi(documentId.toString(), s3Key);
    } catch (error) {
      console.error('Erro ao notificar job-api:', error);
      // Não falha a requisição, o documento foi salvo
      // O job-api pode ter um mecanismo de retry ou polling
    }

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

export { upload };

