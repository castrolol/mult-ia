import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

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

