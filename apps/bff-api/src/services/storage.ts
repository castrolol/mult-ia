import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true, // Necessário para Minio
  });

  console.log('✓ Cliente S3 inicializado');
  return s3Client;
}

function getBucket(): string {
  return process.env.S3_BUCKET || 'pdf-uploads';
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = 'application/pdf'
): Promise<string> {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  console.log(`✓ Arquivo uploaded: ${key}`);
  return key;
}

/**
 * Baixa um arquivo do S3/MinIO
 * @param key - Chave do arquivo no bucket
 * @returns Buffer com o conteúdo do arquivo
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getS3Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`Arquivo não encontrado: ${key}`);
  }

  // Converter stream para Buffer
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

