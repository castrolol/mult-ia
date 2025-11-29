import { Hono } from 'hono'
import { IncomingMessage } from 'http'
import formidable from 'formidable'
import { readFile } from 'fs/promises'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { db, schema } from '../lib/db.js'
import { uploadFile } from '../services/storage.js'
import { addJob } from '../services/queue.js'

const upload = new Hono()

// Helper to extract native Node.js request
function getNodeRequest(c: any): IncomingMessage | null {
  // @hono/node-server exposes original request via env
  return c.env?.incoming ?? null
}

// FormData parser using formidable
async function parseFormData(
  req: IncomingMessage
): Promise<{ file: formidable.File | null }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    })

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }

      const fileArray = files['file']
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
      resolve({ file: file ?? null })
    })
  })
}

upload.post('/', async (c) => {
  try {
    const nodeReq = getNodeRequest(c)

    if (!nodeReq) {
      return c.json({ error: 'Requisição inválida' }, 400)
    }

    const { file } = await parseFormData(nodeReq)

    if (!file) {
      return c.json({ error: 'Arquivo PDF é obrigatório' }, 400)
    }

    if (file.mimetype !== 'application/pdf') {
      return c.json({ error: 'Apenas arquivos PDF são aceitos' }, 400)
    }

    // Generate unique ID for the document
    const documentId = createId()
    const filename = file.originalFilename || 'document.pdf'
    const s3Key = `uploads/${documentId}/${filename}`

    // 1. Read file from temp disk and upload to MinIO/S3
    const buffer = await readFile(file.filepath)
    await uploadFile(s3Key, buffer, file.mimetype || 'application/pdf')

    // 2. Save record to PostgreSQL using Drizzle
    const [document] = await db
      .insert(schema.documents)
      .values({
        id: documentId,
        filename,
        status: 'pending',
      })
      .returning()

    // 3. Add job to queue
    await addJob({
      documentId,
      s3Key,
    })

    // 4. Return 202 Accepted
    return c.json(
      {
        message: 'Documento recebido e em processamento',
        documentId: document?.id ?? documentId,
        filename: document?.filename ?? filename,
        status: document?.status ?? 'pending',
      },
      202
    )
  } catch (error) {
    console.error('Erro no upload:', error)
    return c.json({ error: 'Erro interno ao processar upload' }, 500)
  }
})

// Endpoint to check document status
upload.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    })

    if (!document) {
      return c.json({ error: 'Documento não encontrado' }, 404)
    }

    return c.json({
      documentId: document.id,
      filename: document.filename,
      status: document.status,
      totalPages: document.totalPages,
      error: document.error,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })
  } catch (error) {
    console.error('Erro ao buscar documento:', error)
    return c.json({ error: 'Erro interno' }, 500)
  }
})

export { upload }
