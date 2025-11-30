import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';

const swagger = new Hono();

// OpenAPI Spec
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Edital BFF API',
    version: '1.0.0',
    description: `
# Backend For Frontend - Editais de Licitação

API unificada para o frontend consumir dados de editais processados.

## Arquitetura

\`\`\`
Frontend (Web) → BFF API (3000) → Job API (3001) → MongoDB
                    ↓
               Upload → S3
\`\`\`

## Fluxo de Uso

1. **Upload**: \`POST /upload\` - Envia PDF do edital
2. **Processar**: \`POST /documents/:id/process\` - Inicia extração
3. **Acompanhar**: \`GET /documents/:id\` - Verifica status
4. **Consultar**: Timeline, Estrutura, Riscos

## Recursos

- **Documents**: Metadados e status de processamento
- **Timeline**: Cronograma de eventos e prazos
- **Structure**: Estrutura hierárquica do documento
- **Risks**: Riscos identificados e mitigações
    `,
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'BFF - Desenvolvimento local',
    },
  ],
  tags: [
    { name: 'Upload', description: 'Upload de documentos PDF' },
    { name: 'Documents', description: 'Gerenciamento de documentos' },
    { name: 'Timeline', description: 'Cronograma de eventos e prazos' },
    { name: 'Structure', description: 'Estrutura hierárquica do documento' },
    { name: 'Risks', description: 'Riscos identificados' },
    { name: 'Comments', description: 'Comentários em eventos' },
  ],
  paths: {
    // ========================================================================
    // UPLOAD
    // ========================================================================
    '/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload de PDF',
        description: 'Faz upload de um arquivo PDF de edital para processamento',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo PDF do edital',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Upload realizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    documentId: { type: 'string' },
                    filename: { type: 'string' },
                    s3Key: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Arquivo inválido ou não enviado' },
        },
      },
    },

    // ========================================================================
    // DOCUMENTS
    // ========================================================================
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'Lista documentos',
        description: 'Retorna lista paginada de documentos com status de processamento',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { 
            name: 'status', 
            in: 'query', 
            schema: { 
              type: 'string', 
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] 
            } 
          },
        ],
        responses: {
          200: {
            description: 'Lista de documentos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    documents: { type: 'array', items: { $ref: '#/components/schemas/DocumentSummary' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Detalhes do documento',
        description: 'Retorna metadados completos e estatísticas de processamento',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detalhes do documento' },
          404: { description: 'Documento não encontrado' },
        },
      },
    },
    '/documents/{id}/process': {
      post: {
        tags: ['Documents'],
        summary: 'Iniciar processamento',
        description: 'Inicia a extração de entidades do documento',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          202: { description: 'Processamento iniciado' },
          404: { description: 'Documento não encontrado' },
          409: { description: 'Documento já em processamento' },
        },
      },
    },
    '/documents/{id}/pdf-url': {
      get: {
        tags: ['Documents'],
        summary: 'URL assinada do PDF',
        description: 'Gera URL temporária para visualização do PDF',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'expiresIn', in: 'query', schema: { type: 'integer', default: 3600 } },
        ],
        responses: {
          200: {
            description: 'URL assinada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/documents/{id}/summary': {
      get: {
        tags: ['Documents'],
        summary: 'Resumo rápido',
        description: 'Retorna resumo com prazos críticos e riscos principais',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Resumo do documento' },
        },
      },
    },

    // ========================================================================
    // TIMELINE
    // ========================================================================
    '/timeline/{documentId}': {
      get: {
        tags: ['Timeline'],
        summary: 'Timeline completo',
        description: 'Retorna todos os eventos organizados por categoria (com data, relativos, avulsos)',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Timeline do documento',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timeline: { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
                    relativeEvents: { type: 'array' },
                    unresolvedEvents: { type: 'array' },
                    stats: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/timeline/{documentId}/critical': {
      get: {
        tags: ['Timeline'],
        summary: 'Eventos críticos',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: { 200: { description: 'Eventos críticos' } },
      },
    },
    '/timeline/{documentId}/by-phase': {
      get: {
        tags: ['Timeline'],
        summary: 'Por fase do processo',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Eventos por fase' } },
      },
    },
    '/timeline/{documentId}/events/{eventId}': {
      get: {
        tags: ['Timeline'],
        summary: 'Detalhes do evento',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detalhes do evento com comentários' },
          404: { description: 'Evento não encontrado' },
        },
      },
    },
    '/timeline/{documentId}/events/{eventId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'Lista comentários',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Lista de comentários' } },
      },
      post: {
        tags: ['Comments'],
        summary: 'Adiciona comentário',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content', 'author'],
                properties: {
                  content: { type: 'string' },
                  author: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Comentário criado' } },
      },
    },
    '/timeline/{documentId}/events/{eventId}/comments/{commentId}': {
      put: {
        tags: ['Comments'],
        summary: 'Atualiza comentário',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Comentário atualizado' } },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Remove comentário',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Comentário removido' } },
      },
    },

    // ========================================================================
    // STRUCTURE
    // ========================================================================
    '/structure/{documentId}': {
      get: {
        tags: ['Structure'],
        summary: 'Árvore hierárquica',
        description: 'Retorna estrutura completa do documento em formato de árvore',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Árvore hierárquica' } },
      },
    },
    '/structure/{documentId}/flat': {
      get: {
        tags: ['Structure'],
        summary: 'Lista flat',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { type: 'string', enum: ['CHAPTER', 'SECTION', 'CLAUSE', 'SUBCLAUSE', 'ITEM'] } },
        ],
        responses: { 200: { description: 'Lista de seções' } },
      },
    },
    '/structure/{documentId}/sections/{sectionId}': {
      get: {
        tags: ['Structure'],
        summary: 'Detalhes da seção',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Detalhes com breadcrumb e entidades' } },
      },
    },

    // ========================================================================
    // RISKS
    // ========================================================================
    '/risks/{documentId}': {
      get: {
        tags: ['Risks'],
        summary: 'Lista riscos',
        description: 'Retorna todos os riscos com entidades vinculadas',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['score', 'severity', 'probability'], default: 'score' } },
        ],
        responses: { 200: { description: 'Lista de riscos enriquecidos' } },
      },
    },
    '/risks/{documentId}/critical': {
      get: {
        tags: ['Risks'],
        summary: 'Riscos críticos',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Riscos críticos' } },
      },
    },
    '/risks/{documentId}/by-category': {
      get: {
        tags: ['Risks'],
        summary: 'Por categoria',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Riscos agrupados por categoria' } },
      },
    },
    '/risks/{documentId}/{riskId}': {
      get: {
        tags: ['Risks'],
        summary: 'Detalhes do risco',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'riskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Detalhes do risco' } },
      },
    },

    // ========================================================================
    // HEALTH
    // ========================================================================
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API funcionando',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      DocumentSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
          percentage: { type: 'integer' },
          currentStage: { type: 'string' },
          totalPages: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TimelineEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date-time', nullable: true },
          dateRaw: { type: 'string' },
          eventType: { type: 'string' },
          phase: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          importance: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          linkedPenalties: { type: 'array' },
          linkedRequirements: { type: 'array' },
          urgency: { type: 'object' },
          commentsCount: { type: 'integer' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
};

// Endpoint para servir o spec JSON
swagger.get('/spec', (c) => {
  return c.json(openApiSpec);
});

// Swagger UI
swagger.get(
  '/ui',
  swaggerUI({
    url: '/swagger/spec',
  })
);

// Redirecionamento da raiz para UI
swagger.get('/', (c) => {
  return c.redirect('/swagger/ui');
});

export { swagger };

