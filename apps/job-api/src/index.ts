import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { connectDatabase } from './services/database.js';
import { setProcessHandler } from './services/queue.js';
import { processDocument } from './workers/pdf-processor.js';
import { process as processRoute } from './routes/process.js';

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Rotas
app.route('/process', processRoute);

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
    // Conectar ao MongoDB
    await connectDatabase();

    // Configurar handler da fila
    setProcessHandler(processDocument);

    // Iniciar servidor
    const port = parseInt(process.env.PORT || '3001', 10);
    
    console.log(`\n🚀 Job API rodando em http://localhost:${port}`);
    console.log('   Endpoints:');
    console.log('   - POST /process       → Iniciar processamento de documento');
    console.log('   - GET  /health        → Health check\n');

    serve({
      fetch: app.fetch,
      port,
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

main();

