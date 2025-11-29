import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/multia';
  
  client = new MongoClient(uri, {
    // Opções TLS para compatibilidade com MongoDB Atlas em containers
    tls: uri.includes('mongodb+srv') || uri.includes('mongodb.net'),
    tlsAllowInvalidCertificates: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  
  db = client.db();
  console.log('✓ Conectado ao MongoDB');
  
  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database não inicializado. Chame connectDatabase() primeiro.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✓ Desconectado do MongoDB');
  }
}

