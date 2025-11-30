import { tool } from 'ai';
import { z } from 'zod';
import { getDatabase } from '../services/database.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import type {
  ExtractedEntity,
  RawExtractedEntity,
  EntityType
} from '../types/entities.js';

/**
 * Schema Zod para os tipos de entidade
 */
const EntityTypeSchema = z.enum([
  'PRAZO',
  'DATA',	
  'REGRA_ENTREGA',
  'RISCO',
  'MULTA',
  'REQUISITO',
  'CERTIDAO_TECNICA',
  'DOCUMENTACAO_OBRIGATORIA',
  'INDEFINIDO',
  'OUTRO',
]).describe('Tipo de entidade. Valores: PRAZO, DATA, REGRA_ENTREGA, RISCO, MULTA, REQUISITO, CERTIDAO_TECNICA, DOCUMENTACAO_OBRIGATORIA, INDEFINIDO, OUTRO');

/**
 * Schema Zod para entidade bruta extraída pela IA
 * Nota: Todos os campos são obrigatórios para compatibilidade com a API da OpenAI
 */
const RawEntitySchema = z.object({
  type: EntityTypeSchema,
  name: z.string().describe('Nome legível da entidade'),
  rawValue: z.string().describe('Valor bruto extraído do texto'),
  semanticKey: z.string().describe('Chave semântica única para identificar a entidade (ex: PRAZO:SESSAO_PUBLICA:2024-09-24)'),
  metadataJson: z.string().describe('Metadados específicos do tipo de entidade em formato JSON string. Use "{}" se não houver metadados'),
  confidence: z.number().min(0).max(1).describe('Confiança da extração (0-1)'),
  excerptText: z.string().describe('Trecho original do documento (máx 200 chars). Use string vazia se não houver'),
  sectionTitle: z.string().describe('Título da seção onde a entidade foi encontrada. Use string vazia se não houver'),
});

/**
 * Schema para referência cruzada entre entidades
 */
const CrossReferenceSchema = z.object({
  entity1SemanticKey: z.string(),
  entity2SemanticKey: z.string(),
  relationship: z.string().describe('Tipo de relação (ex: MESMA_DATA, MESMO_VALOR, RELACIONADO)'),
});

/**
 * Cria as tools disponíveis para a IA durante análise de páginas
 */
export function createTools(documentId: string, pageNumber: number, pageId: string) {
  const db = getDatabase();
  const unificationService = getEntityUnificationService();

  return {
    /**
     * Tool para buscar entidades existentes no documento
     * Útil para verificar duplicatas e referências cruzadas
     */
    findEntities: tool({
      description:
        'Busca entidades já extraídas deste documento. Use para verificar se uma entidade já foi identificada em páginas anteriores e evitar duplicatas.',
      parameters: z.object({
        query: z
          .string()
          .describe('Termo de busca: pode ser semanticKey, nome ou tipo da entidade'),
        type: z
          .string()
          .describe('Filtrar por tipo de entidade (PRAZO, DATA, REGRA_ENTREGA, RISCO, MULTA, REQUISITO, CERTIDAO_TECNICA, DOCUMENTACAO_OBRIGATORIA, INDEFINIDO, OUTRO)'),
      }),
      execute: async ({ query, type }) => {
        try {
          const filter: Record<string, unknown> = { documentId };

          if (type) {
            filter.type = type.toUpperCase() as EntityType;
          }

          if (query.length >= 3) {
            filter.$or = [
              { deduplicationKey: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } },
              { rawValue: { $regex: query, $options: 'i' } },
            ];
          } else if (query) {
            filter.deduplicationKey = query;
          }

          const entities = await db
            .collection<ExtractedEntity>('entities')
            .find(filter)
            .limit(20)
            .toArray();

          // Retornar versão simplificada para a IA
          return entities.map((e) => ({
            semanticKey: e.deduplicationKey,
            type: e.type,
            name: e.name,
            normalizedValue: e.normalizedValue,
            confidence: e.confidence,
            referenceCount: e.references.length,
          }));
        } catch (error) {
          console.error('Erro ao buscar entidades:', error);
          return [];
        }
      },
    }),

    /**
     * Tool para obter as semantic keys já extraídas
     * Útil para evitar duplicatas durante a extração
     */
    getExistingKeys: tool({
      description:
        'Retorna todas as semantic keys de entidades já extraídas deste documento. Use antes de extrair para verificar o que já foi identificado.',
      parameters: z.object({}),
      execute: async () => {
        try {
          const keys = await unificationService.getExistingSemanticKeys(documentId);
          return keys;
        } catch (error) {
          console.error('Erro ao buscar semantic keys:', error);
          return [];
        }
      },
    }),

    /**
     * Tool principal para salvar entidades extraídas
     * Usa o serviço de unificação para normalizar e deduplicar
     */
    saveEntities: tool({
      description: `Salva as entidades extraídas da página atual. 
O serviço irá automaticamente:
- Normalizar valores (datas, moeda, percentuais)
- Verificar duplicatas pela semanticKey
- Resolver conflitos mantendo o valor com maior confiança
- Mesclar referências quando a mesma entidade aparece em múltiplas páginas`,
      parameters: z.object({
        entities: z
          .array(RawEntitySchema)
          .describe('Lista de entidades extraídas da página'),
        crossReferences: z
          .array(CrossReferenceSchema)
          .describe('Referências cruzadas identificadas entre entidades'),
      }),
      execute: async ({ entities, crossReferences }) => {
        try {
          // Converter para formato RawExtractedEntity
          const rawEntities: RawExtractedEntity[] = entities.map((e) => {
            // Parse do metadataJson para objeto
            let metadata: Record<string, unknown> = {};
            try {
              if (e.metadataJson && e.metadataJson !== '{}') {
                metadata = JSON.parse(e.metadataJson);
              }
            } catch {
              // Se falhar o parse, usar objeto vazio
              metadata = {};
            }

            return {
              type: e.type.toUpperCase() as EntityType,
              name: e.name,
              rawValue: e.rawValue,
              semanticKey: e.semanticKey,
              metadata,
              confidence: e.confidence ?? 0.8,
              pageNumber,
              pageId,
              sectionTitle: e.sectionTitle || undefined,
              excerptText: e.excerptText || '',
            };
          });

          // Processar através do serviço de unificação
          const result = await unificationService.unifyEntities(
            documentId,
            rawEntities
          );

          // Salvar referências cruzadas se fornecidas
          if (crossReferences && crossReferences.length > 0) {
            await db.collection('cross_references').insertMany(
              crossReferences.map((cr) => ({
                documentId,
                pageNumber,
                ...cr,
                createdAt: new Date(),
              }))
            );
          }

          console.log(
            `   📊 Página ${pageNumber}: ${result.created} novas, ${result.updated} atualizadas, ${result.conflictsResolved} conflitos resolvidos`
          );

          return {
            success: true,
            created: result.created,
            updated: result.updated,
            conflictsResolved: result.conflictsResolved,
            totalEntities: result.entities.length,
            conflicts: result.conflicts.map((c) => ({
              key: c.deduplicationKey,
              resolution: c.resolution,
            })),
          };
        } catch (error) {
          console.error('Erro ao salvar entidades:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          };
        }
      },
    }),

    /**
     * Tool para buscar contexto global (configurações, referências)
     */
    getGlobalContext: tool({
      description:
        'Busca configurações ou referências globais do sistema que podem ajudar na análise.',
      parameters: z.object({
        key: z.string().describe('Chave do contexto a buscar'),
      }),
      execute: async ({ key }) => {
        try {
          const context = await db.collection('global_context').findOne({ key });
          return context?.value || null;
        } catch (error) {
          console.error('Erro ao buscar contexto global:', error);
          return null;
        }
      },
    }),
  };
}

/**
 * Tipo inferido das tools criadas
 */
export type EntityExtractionTools = ReturnType<typeof createTools>;
