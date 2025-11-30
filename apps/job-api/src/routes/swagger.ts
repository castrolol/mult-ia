import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';

const swagger = new Hono();

// OpenAPI Spec
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Edital API - Extração de Entidades de Licitações',
    version: '1.0.0',
    description: `
API para processamento e extração de informações de editais de licitação pública.

## Funcionalidades

- **Documentos**: Upload, listagem e metadados de documentos
- **Timeline**: Cronograma de eventos e prazos
- **Estrutura**: Hierarquia do documento (capítulos, seções, cláusulas)
- **Riscos**: Identificação e categorização de riscos
- **Comentários**: Anotações em eventos do timeline

## Fluxo de Uso

1. Faça upload do PDF e inicie o processamento via \`POST /process\`
2. Acompanhe o progresso via \`GET /documents/{id}\`
3. Após conclusão, consulte timeline, estrutura e riscos
    `,
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Desenvolvimento local',
    },
  ],
  tags: [
    { name: 'Documents', description: 'Gerenciamento de documentos' },
    { name: 'Timeline', description: 'Cronograma de eventos e prazos' },
    { name: 'Structure', description: 'Estrutura hierárquica do documento' },
    { name: 'Risks', description: 'Riscos identificados' },
    { name: 'Comments', description: 'Comentários em eventos' },
    { name: 'Process', description: 'Processamento de documentos' },
  ],
  paths: {
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
    '/documents/{id}/pdf-url': {
      get: {
        tags: ['Documents'],
        summary: 'URL assinada do PDF',
        description: 'Gera URL temporária para visualização do PDF',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'expiresIn', in: 'query', schema: { type: 'integer', default: 3600 }, description: 'Tempo de expiração em segundos' },
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
                    relativeEvents: { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
                    unresolvedEvents: { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
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
        description: 'Retorna eventos críticos e próximos prazos',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: {
          200: { description: 'Eventos críticos' },
        },
      },
    },
    '/timeline/{documentId}/by-phase': {
      get: {
        tags: ['Timeline'],
        summary: 'Por fase do processo',
        description: 'Retorna eventos agrupados por fase do processo licitatório',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Eventos por fase' },
        },
      },
    },
    '/timeline/{documentId}/events/{eventId}': {
      get: {
        tags: ['Timeline'],
        summary: 'Detalhes do evento',
        description: 'Retorna detalhes de um evento com seus comentários',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detalhes do evento' },
          404: { description: 'Evento não encontrado' },
        },
      },
    },
    '/timeline/{documentId}/events/{eventId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'Lista comentários',
        description: 'Retorna todos os comentários de um evento',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Lista de comentários' },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Adiciona comentário',
        description: 'Cria um novo comentário em um evento',
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
        responses: {
          201: { description: 'Comentário criado' },
          400: { description: 'Dados inválidos' },
        },
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
                properties: {
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Comentário atualizado' },
          404: { description: 'Comentário não encontrado' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Remove comentário',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Comentário removido' },
          404: { description: 'Comentário não encontrado' },
        },
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
        responses: {
          200: {
            description: 'Árvore hierárquica',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tree: { type: 'array', items: { $ref: '#/components/schemas/SectionNode' } },
                    stats: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/structure/{documentId}/flat': {
      get: {
        tags: ['Structure'],
        summary: 'Lista flat',
        description: 'Retorna seções em formato de lista',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { type: 'string', enum: ['CHAPTER', 'SECTION', 'CLAUSE', 'SUBCLAUSE', 'ITEM'] } },
        ],
        responses: {
          200: { description: 'Lista de seções' },
        },
      },
    },
    '/structure/{documentId}/sections/{sectionId}': {
      get: {
        tags: ['Structure'],
        summary: 'Detalhes da seção',
        description: 'Retorna detalhes de uma seção com breadcrumb, filhos e entidades vinculadas',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detalhes da seção' },
          404: { description: 'Seção não encontrada' },
        },
      },
    },

    // ========================================================================
    // RISKS
    // ========================================================================
    '/risks/{documentId}': {
      get: {
        tags: ['Risks'],
        summary: 'Lista riscos',
        description: 'Retorna todos os riscos identificados',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['score', 'severity', 'probability'], default: 'score' } },
        ],
        responses: {
          200: {
            description: 'Lista de riscos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    risks: { type: 'array', items: { $ref: '#/components/schemas/Risk' } },
                    stats: { type: 'object' },
                    categories: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/risks/{documentId}/critical': {
      get: {
        tags: ['Risks'],
        summary: 'Riscos críticos',
        description: 'Retorna apenas riscos de alta severidade',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Riscos críticos' },
        },
      },
    },
    '/risks/{documentId}/by-category': {
      get: {
        tags: ['Risks'],
        summary: 'Por categoria',
        description: 'Retorna riscos agrupados por categoria',
        parameters: [
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Riscos por categoria' },
        },
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
        responses: {
          200: { description: 'Detalhes do risco' },
          404: { description: 'Risco não encontrado' },
        },
      },
    },

    // ========================================================================
    // PROCESS
    // ========================================================================
    '/process': {
      post: {
        tags: ['Process'],
        summary: 'Iniciar processamento',
        description: 'Inicia o processamento de extração de entidades de um documento',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentId', 's3Key'],
                properties: {
                  documentId: { type: 'string', description: 'ID do documento no MongoDB' },
                  s3Key: { type: 'string', description: 'Chave do arquivo no S3' },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Processamento iniciado' },
          400: { description: 'Dados inválidos' },
          404: { description: 'Documento não encontrado' },
          409: { description: 'Documento já em processamento' },
        },
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
          pagesProcessed: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TimelineEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date-time', nullable: true },
          dateRaw: { type: 'string' },
          dateType: { type: 'string', enum: ['FIXED', 'RELATIVE', 'RANGE'] },
          eventType: { type: 'string' },
          phase: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          importance: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          actionRequired: { type: 'string' },
          linkedPenalties: { type: 'array', items: { type: 'object' } },
          linkedRequirements: { type: 'array', items: { type: 'object' } },
          tags: { type: 'array', items: { type: 'string' } },
          urgency: { type: 'object' },
          commentsCount: { type: 'integer' },
        },
      },
      SectionNode: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          level: { type: 'string', enum: ['CHAPTER', 'SECTION', 'CLAUSE', 'SUBCLAUSE', 'ITEM'] },
          number: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/components/schemas/SectionNode' } },
        },
      },
      Risk: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          probability: { type: 'string', enum: ['CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY'] },
          score: { type: 'integer' },
          mitigation: { type: 'object' },
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

