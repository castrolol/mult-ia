import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { connectDatabase } from './services/database.js';
import { upload } from './routes/upload.js';
import { documents } from './routes/documents.js';

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/upload', upload);
app.route('/documents', documents);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler global
app.onError((err, c) => {
  console.error('Erro não tratado:', err);
  return c.json({ error: 'Erro interno do servidor' }, 500);
});

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Rota não encontrada' }, 404);
});

// Inicialização
async function main() {
  try {
    // Conectar ao PostgreSQL
    await connectDatabase();

    // Iniciar servidor
    const port = parseInt(process.env.PORT || '3001', 10);

    console.log(`\n🚀 Servidor Hono rodando em http://localhost:${port}`);
    console.log('   Endpoints:');
    console.log('   - POST /upload              → Upload de PDF');
    console.log('   - GET  /upload/:id          → Status do documento');
    console.log('   - GET  /api/documents       → Listar documentos');
    console.log('   - GET  /api/documents/:id   → Detalhes do documento');
    console.log('   - GET  /health              → Health check\n');

    serve({
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

main();

