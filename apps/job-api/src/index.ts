import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { connectDatabase } from './services/database.js';
import { setProcessHandler } from './services/queue.js';
import { processDocument } from './workers/pdf-processor.js';

// Rotas
import { process as processRoute } from './routes/process.js';
import { documents } from './routes/documents.js';
import { timeline } from './routes/timeline.js';
import { structure } from './routes/structure.js';
import { risks } from './routes/risks.js';
import { swagger } from './routes/swagger.js';
import { chat } from './routes/chat.js';

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// ============================================================================
// ROTAS
// ============================================================================

// Processamento
app.route('/process', processRoute);

// Documentos
app.route('/documents', documents);

// Timeline
app.route('/timeline', timeline);

// Estrutura
app.route('/structure', structure);

// Riscos
app.route('/risks', risks);

// Chat RAG
app.route('/chat', chat);

// Swagger
app.route('/swagger', swagger);

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
    const port = parseInt(process.env.PORT || '3002', 10);

    console.log(`\n🚀 Job API rodando em http://localhost:${port}`);
    console.log('');
    console.log('📚 Documentação:');
    console.log(`   - Swagger UI:  http://localhost:${port}/swagger/ui`);
    console.log(`   - OpenAPI Spec: http://localhost:${port}/swagger/spec`);
    console.log('');
    console.log('📋 Endpoints principais:');
    console.log('   - POST /process              → Iniciar processamento');
    console.log('   - GET  /documents            → Lista documentos');
    console.log('   - GET  /documents/:id        → Detalhes do documento');
    console.log('   - GET  /documents/:id/pdf-url → URL assinada do PDF');
    console.log('   - GET  /timeline/:id         → Timeline do documento');
    console.log('   - GET  /structure/:id        → Estrutura hierárquica');
    console.log('   - GET  /risks/:id            → Riscos identificados');
    console.log('   - GET  /health               → Health check');
    console.log('');
    console.log('💬 Chat RAG:');
    console.log('   - POST /chat/:documentId     → Enviar mensagem');
    console.log('   - GET  /chat/:documentId     → Listar conversas');
    console.log('   - GET  /chat/:documentId/:id → Histórico conversa');
    console.log('   - POST /chat/:documentId/new → Nova conversa');
    console.log('   - POST /chat/:documentId/rag/prepare → Preparar RAG');
    console.log('   - GET  /chat/:documentId/rag/status  → Status RAG');
    console.log('');

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

