import { tool } from 'ai';
import { z } from 'zod';
import { getDatabase } from '../services/database.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import { getDocumentStructureService } from '../services/document-structure.js';
import { getTimelineService } from '../services/timeline.js';
import { getRiskService } from '../services/risk.js';
import type {
  ExtractedEntity,
  RawExtractedEntity,
  RawDocumentSection,
  RawTimelineEvent,
  RawRisk,
  EntityType,
  DocumentSectionLevel,
  EntityRelationship,
  ImportanceLevel,
  ProbabilityLevel,
  ResponsibleParty,
} from '../types/entities.js';

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

const EntityTypeSchema = z.enum([
  'PRAZO',
  'DATA',
  'OBRIGACAO',
  'REQUISITO',
  'MULTA',
  'SANCAO',
  'RISCO',
  'REGRA_ENTREGA',
  'CERTIDAO_TECNICA',
  'DOCUMENTACAO',
  'OUTRO',
]);

const SectionLevelSchema = z.enum([
  'CHAPTER',
  'SECTION',
  'CLAUSE',
  'SUBCLAUSE',
  'ITEM',
]);

const ImportanceLevelSchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

const ProbabilityLevelSchema = z.enum(['CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY']);

const ResponsiblePartySchema = z.enum(['LICITANTE', 'ORGAO', 'AMBOS']);

const RelationshipSchema = z.enum([
  'DEPENDS_ON',
  'TRIGGERS',
  'SAME_DATE',
  'SAME_VALUE',
  'PREREQUISITE',
  'CONSEQUENCE',
  'PENALTY_FOR',
  'REQUIRED_BY',
]);

const DateTypeSchema = z.enum(['FIXED', 'RELATIVE', 'RANGE']);

// ============================================================================
// SCHEMAS DE ENTIDADES
// ============================================================================

const ObligationDetailsSchema = z.object({
  action: z.string().describe('Ação que deve ser realizada'),
  responsible: ResponsiblePartySchema.describe('Quem é responsável'),
  mandatory: z.boolean().describe('Se é obrigatória'),
  linkedDeadlineKey: z.string().describe('SemanticKey do prazo associado. Use "" se não houver'),
});

const RelatedEntitySchema = z.object({
  semanticKey: z.string().describe('SemanticKey da entidade relacionada'),
  relationship: RelationshipSchema.describe('Tipo de relacionamento'),
});

const RawEntitySchema = z.object({
  type: EntityTypeSchema.describe('Tipo da entidade'),
  name: z.string().describe('Nome legível da entidade'),
  rawValue: z.string().describe('Valor bruto extraído do texto'),
  semanticKey: z.string().describe('Chave semântica única (TIPO:CONTEXTO:ID)'),
  sectionId: z.string().describe('ID da seção do documento. Use "" se não houver'),
  metadataJson: z.string().describe('Metadados específicos em JSON. Use "{}" se vazio'),
  obligationDetailsJson: z.string().describe('Detalhes de obrigação em JSON. Use "" se não for OBRIGACAO'),
  relatedSemanticKeysJson: z.string().describe('Array de relacionamentos em JSON. Use "[]" se vazio'),
  confidence: z.number().min(0).max(1).describe('Confiança (0-1)'),
  excerptText: z.string().describe('Trecho do documento (max 300 chars)'),
});

// ============================================================================
// SCHEMAS DE SEÇÕES
// ============================================================================

const RawSectionSchema = z.object({
  level: SectionLevelSchema.describe('Nível hierárquico'),
  number: z.string().describe('Numeração (1.1, Art. 1º, etc.). Use "" se não houver'),
  title: z.string().describe('Título da seção'),
  parentNumber: z.string().describe('Número da seção pai. Use "" se for raiz'),
  summary: z.string().describe('Resumo (max 100 chars). Use "" se não houver'),
  pageNumber: z.number().describe('Número da página'),
  lineStart: z.number().describe('Linha inicial. Use 0 se desconhecido'),
  lineEnd: z.number().describe('Linha final. Use 0 se desconhecido'),
});

// ============================================================================
// SCHEMAS DE TIMELINE
// ============================================================================

const RawTimelineEventSchema = z.object({
  dateRaw: z.string().describe('Data como aparece no texto'),
  dateNormalized: z.string().describe('Data normalizada (YYYY-MM-DD ou ISO). Use "" se não conseguir normalizar'),
  dateType: DateTypeSchema.describe('Tipo de data'),
  eventType: z.string().describe('Tipo do evento (SESSAO_PUBLICA, ENTREGA, etc.)'),
  title: z.string().describe('Título do evento'),
  description: z.string().describe('Descrição para o usuário'),
  importance: ImportanceLevelSchema.describe('Nível de importância'),
  actionRequired: z.string().describe('Ação que o licitante deve tomar. Use "" se não houver'),
  tagsJson: z.string().describe('Array de tags em JSON. Ex: ["PROPOSTA", "SESSAO"]'),
  linkedPenaltyKeysJson: z.string().describe('Array de semanticKeys de multas em JSON. Use "[]" se vazio'),
  linkedRequirementKeysJson: z.string().describe('Array de semanticKeys de requisitos em JSON. Use "[]" se vazio'),
  linkedObligationKeysJson: z.string().describe('Array de semanticKeys de obrigações em JSON. Use "[]" se vazio'),
  linkedRiskKeysJson: z.string().describe('Array de semanticKeys de riscos em JSON. Use "[]" se vazio'),
  relativeToJson: z.string().describe('Referência relativa em JSON. Use "" se data fixa'),
  sourceSemanticKey: z.string().describe('SemanticKey da entidade fonte (PRAZO/DATA)'),
  pageNumber: z.number().describe('Número da página'),
  excerpt: z.string().describe('Trecho do documento'),
  confidence: z.number().min(0).max(1).describe('Confiança'),
});

// ============================================================================
// SCHEMAS DE RISCOS
// ============================================================================

const MitigationSchema = z.object({
  action: z.string().describe('Ação de mitigação'),
  deadline: z.string().describe('Prazo para mitigação. Use "" se não houver'),
  cost: z.string().describe('Custo estimado. Use "" se não houver'),
});

const RawRiskSchema = z.object({
  category: z.string().describe('Categoria do risco (FISCAL, TECNICO, PRAZO, COMPLIANCE, etc.)'),
  subcategory: z.string().describe('Subcategoria. Use "" se não houver'),
  title: z.string().describe('Título do risco'),
  description: z.string().describe('Descrição detalhada'),
  trigger: z.string().describe('O que ativa o risco'),
  consequence: z.string().describe('Consequência se materializar'),
  severity: ImportanceLevelSchema.describe('Gravidade'),
  probability: ProbabilityLevelSchema.describe('Probabilidade'),
  mitigationJson: z.string().describe('Mitigação sugerida em JSON. Use "" se não houver'),
  linkedEntityKeysJson: z.string().describe('Array de semanticKeys de entidades em JSON. Use "[]" se vazio'),
  linkedTimelineKeysJson: z.string().describe('Array de semanticKeys de timeline em JSON. Use "[]" se vazio'),
  pageNumber: z.number().describe('Número da página'),
  excerpt: z.string().describe('Trecho do documento'),
  confidence: z.number().min(0).max(1).describe('Confiança'),
});

// ============================================================================
// FACTORY DE TOOLS
// ============================================================================

/**
 * Cria as tools para extração de estrutura (Estágio 1)
 */
export function createStructureTools(documentId: string, batchNumber: number) {
  const structureService = getDocumentStructureService();

  return {
    saveSections: tool({
      description: 'Salva as seções/estrutura hierárquica identificadas no documento',
      parameters: z.object({
        sections: z.array(RawSectionSchema).describe('Lista de seções identificadas'),
      }),
      execute: async ({ sections }) => {
        try {
          const rawSections: RawDocumentSection[] = sections.map(s => ({
            level: s.level as DocumentSectionLevel,
            title: s.title,
            number: s.number || undefined,
            summary: s.summary || undefined,
            parentNumber: s.parentNumber || undefined,
            pageNumber: s.pageNumber,
            lineStart: s.lineStart || undefined,
            lineEnd: s.lineEnd || undefined,
          }));

          const created = await structureService.processSections(documentId, rawSections);

          console.log(`   📁 Batch ${batchNumber}: ${created.length} seções salvas`);

          return {
            success: true,
            sectionsCreated: created.length,
            sectionIds: created.map(s => ({ id: s.id, number: s.number, title: s.title })),
          };
        } catch (error) {
          console.error('Erro ao salvar seções:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          };
        }
      },
    }),
  };
}

/**
 * Cria as tools para extração de entidades (Estágio 2)
 */
export function createExtractionTools(
  documentId: string,
  batchNumber: number,
  pageNumbers: number[]
) {
  const unificationService = getEntityUnificationService();
  const timelineService = getTimelineService();
  const riskService = getRiskService();

  // Mapa para resolver relacionamentos: semanticKey -> entityId
  const entityMap = new Map<string, string>();
  const timelineMap = new Map<string, string>();

  return {
    saveExtractionResults: tool({
      description: `Salva entidades, eventos de timeline e riscos extraídos do batch.
O serviço irá automaticamente:
- Normalizar valores (datas, moeda, percentuais)
- Verificar duplicatas pela semanticKey
- Resolver conflitos por confiança
- Estabelecer relacionamentos entre entidades`,
      parameters: z.object({
        entities: z.array(RawEntitySchema).describe('Lista de entidades extraídas. Use [] se vazio'),
        timelineEvents: z.array(RawTimelineEventSchema).describe('Eventos do timeline. Use [] se vazio'),
        risks: z.array(RawRiskSchema).describe('Riscos identificados. Use [] se vazio'),
      }),
      execute: async ({ entities, timelineEvents, risks }) => {
        try {
          const results = {
            entitiesCreated: 0,
            entitiesUpdated: 0,
            conflictsResolved: 0,
            timelineEventsCreated: 0,
            risksCreated: 0,
          };

          // 1. Processar entidades
          if (entities.length > 0) {
            const rawEntities: RawExtractedEntity[] = entities.map(e => {
              let metadata: Record<string, unknown> = {};
              try {
                if (e.metadataJson && e.metadataJson !== '{}' && e.metadataJson !== '') {
                  metadata = JSON.parse(e.metadataJson);
                }
              } catch { /* ignore */ }

              let obligationDetails: RawExtractedEntity['obligationDetails'];
              if (e.obligationDetailsJson && e.obligationDetailsJson !== '' && e.obligationDetailsJson !== '{}') {
                try {
                  const parsed = JSON.parse(e.obligationDetailsJson);
                  obligationDetails = {
                    action: parsed.action || '',
                    responsible: parsed.responsible || 'LICITANTE',
                    mandatory: parsed.mandatory ?? true,
                    linkedDeadlineKey: parsed.linkedDeadlineKey || undefined,
                  };
                } catch { /* ignore */ }
              }

              let relatedSemanticKeys: RawExtractedEntity['relatedSemanticKeys'];
              if (e.relatedSemanticKeysJson && e.relatedSemanticKeysJson !== '' && e.relatedSemanticKeysJson !== '[]') {
                try {
                  relatedSemanticKeys = JSON.parse(e.relatedSemanticKeysJson);
                } catch { /* ignore */ }
              }

              return {
                type: e.type as EntityType,
                name: e.name,
                rawValue: e.rawValue,
                semanticKey: e.semanticKey,
                metadata,
                confidence: e.confidence,
                pageNumber: pageNumbers[0] || 1,
                pageId: `batch-${batchNumber}`,
                sectionId: e.sectionId || undefined,
                excerptText: e.excerptText,
                obligationDetails,
                relatedSemanticKeys,
              };
            });

            const unificationResult = await unificationService.unifyEntities(
              documentId,
              rawEntities
            );

            results.entitiesCreated = unificationResult.created;
            results.entitiesUpdated = unificationResult.updated;
            results.conflictsResolved = unificationResult.conflictsResolved;

            // Atualizar mapa de entidades
            for (const entity of unificationResult.entities) {
              entityMap.set(entity.semanticKey, entity.id);
            }
          }

          // 2. Processar eventos do timeline
          if (timelineEvents.length > 0) {
            const rawEvents: RawTimelineEvent[] = timelineEvents.map(e => {
              let tags: string[] = [];
              try {
                const tagsStr = e.tagsJson || '[]';
                if (tagsStr && tagsStr !== '' && tagsStr !== '[]') {
                  tags = JSON.parse(tagsStr);
                }
              } catch { /* ignore */ }

              let linkedPenaltyKeys: string[] | undefined;
              if (e.linkedPenaltyKeysJson && e.linkedPenaltyKeysJson !== '' && e.linkedPenaltyKeysJson !== '[]') {
                try {
                  linkedPenaltyKeys = JSON.parse(e.linkedPenaltyKeysJson);
                } catch { /* ignore */ }
              }

              let linkedRequirementKeys: string[] | undefined;
              if (e.linkedRequirementKeysJson && e.linkedRequirementKeysJson !== '' && e.linkedRequirementKeysJson !== '[]') {
                try {
                  linkedRequirementKeys = JSON.parse(e.linkedRequirementKeysJson);
                } catch { /* ignore */ }
              }

              let linkedObligationKeys: string[] | undefined;
              if (e.linkedObligationKeysJson && e.linkedObligationKeysJson !== '' && e.linkedObligationKeysJson !== '[]') {
                try {
                  linkedObligationKeys = JSON.parse(e.linkedObligationKeysJson);
                } catch { /* ignore */ }
              }

              let linkedRiskKeys: string[] | undefined;
              if (e.linkedRiskKeysJson && e.linkedRiskKeysJson !== '' && e.linkedRiskKeysJson !== '[]') {
                try {
                  linkedRiskKeys = JSON.parse(e.linkedRiskKeysJson);
                } catch { /* ignore */ }
              }

              let relativeTo: RawTimelineEvent['relativeTo'];
              if (e.relativeToJson && e.relativeToJson !== '' && e.relativeToJson !== '{}') {
                try {
                  relativeTo = JSON.parse(e.relativeToJson);
                } catch { /* ignore */ }
              }

              return {
                dateRaw: e.dateRaw,
                dateType: e.dateType as 'FIXED' | 'RELATIVE' | 'RANGE',
                dateNormalized: e.dateNormalized || undefined,
                eventType: e.eventType,
                title: e.title,
                description: e.description,
                importance: e.importance as ImportanceLevel,
                actionRequired: e.actionRequired || undefined,
                tags,
                relativeTo,
                linkedPenaltyKeys,
                linkedRequirementKeys,
                linkedObligationKeys,
                linkedRiskKeys,
                sourceSemanticKey: e.sourceSemanticKey,
                pageNumber: e.pageNumber,
                excerpt: e.excerpt,
                confidence: e.confidence,
              };
            });

            const createdEvents = await timelineService.processTimelineEvents(
              documentId,
              rawEvents,
              entityMap
            );

            results.timelineEventsCreated = createdEvents.length;

            // Atualizar mapa de timeline
            for (const event of createdEvents) {
              timelineMap.set(event.sourceEntityId, event.id);
            }
          }

          // 3. Processar riscos
          if (risks.length > 0) {
            const rawRisks: RawRisk[] = risks.map(r => {
              let mitigation: RawRisk['mitigation'];
              if (r.mitigationJson && r.mitigationJson !== '' && r.mitigationJson !== '{}') {
                try {
                  mitigation = JSON.parse(r.mitigationJson);
                } catch { /* ignore */ }
              }

              let linkedEntityKeys: string[] | undefined;
              if (r.linkedEntityKeysJson && r.linkedEntityKeysJson !== '' && r.linkedEntityKeysJson !== '[]') {
                try {
                  linkedEntityKeys = JSON.parse(r.linkedEntityKeysJson);
                } catch { /* ignore */ }
              }

              let linkedTimelineKeys: string[] | undefined;
              if (r.linkedTimelineKeysJson && r.linkedTimelineKeysJson !== '' && r.linkedTimelineKeysJson !== '[]') {
                try {
                  linkedTimelineKeys = JSON.parse(r.linkedTimelineKeysJson);
                } catch { /* ignore */ }
              }

              return {
                category: r.category,
                subcategory: r.subcategory || undefined,
                title: r.title,
                description: r.description,
                trigger: r.trigger,
                consequence: r.consequence,
                severity: r.severity as ImportanceLevel,
                probability: r.probability as ProbabilityLevel,
                mitigation,
                linkedEntityKeys,
                linkedTimelineKeys,
                pageNumber: r.pageNumber,
                excerpt: r.excerpt,
                confidence: r.confidence,
              };
            });

            const createdRisks = await riskService.processRisks(
              documentId,
              rawRisks,
              entityMap,
              timelineMap
            );

            results.risksCreated = createdRisks.length;
          }

          console.log(`   📊 Batch ${batchNumber}: ${results.entitiesCreated} entidades, ${results.timelineEventsCreated} timeline, ${results.risksCreated} riscos`);

          return {
            success: true,
            ...results,
          };
        } catch (error) {
          console.error('Erro ao salvar resultados:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          };
        }
      },
    }),

    findEntities: tool({
      description: 'Busca entidades já extraídas para verificar duplicatas ou estabelecer relacionamentos',
      parameters: z.object({
        query: z.string().describe('Termo de busca: semanticKey, nome ou tipo'),
        type: z.string().describe('Filtrar por tipo de entidade. Use "" para buscar todos os tipos'),
      }),
      execute: async ({ query, type }) => {
        try {
          const db = getDatabase();
          const filter: Record<string, unknown> = { documentId };

          if (type && type !== '') {
            filter.type = type.toUpperCase() as EntityType;
          }

          if (query.length >= 3) {
            filter.$or = [
              { semanticKey: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } },
              { rawValue: { $regex: query, $options: 'i' } },
            ];
          } else if (query) {
            filter.semanticKey = query;
          }

          const entities = await db
            .collection<ExtractedEntity>('entities')
            .find(filter)
            .limit(20)
            .toArray();

          return entities.map(e => ({
            id: e.id,
            semanticKey: e.semanticKey,
            type: e.type,
            name: e.name,
            normalizedValue: e.normalizedValue,
            confidence: e.confidence,
          }));
        } catch (error) {
          console.error('Erro ao buscar entidades:', error);
          return [];
        }
      },
    }),

    getExistingKeys: tool({
      description: 'Retorna todas as semanticKeys já extraídas do documento',
      parameters: z.object({}),
      execute: async () => {
        try {
          const keys = await unificationService.getExistingSemanticKeys(documentId);
          return keys;
        } catch (error) {
          console.error('Erro ao buscar keys:', error);
          return [];
        }
      },
    }),
  };
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type StructureTools = ReturnType<typeof createStructureTools>;
export type ExtractionTools = ReturnType<typeof createExtractionTools>;
