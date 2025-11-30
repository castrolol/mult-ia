import type { ObjectId } from 'mongodb';

// ============================================================================
// ENUMS E TIPOS BASE
// ============================================================================

/**
 * Status de processamento de uma página
 */
export type PageStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Tipos de entidades extraídas de editais de licitação
 */
export type EntityType =
  | 'PRAZO'              // Datas e deadlines
  | 'DATA'               // Marcos temporais
  | 'OBRIGACAO'          // O que a empresa DEVE FAZER (ações)
  | 'REQUISITO'          // O que a empresa DEVE TER/COMPROVAR
  | 'MULTA'              // Penalidades pecuniárias
  | 'SANCAO'             // Penalidades não-pecuniárias (impedimento, etc)
  | 'RISCO'              // Riscos identificados
  | 'REGRA_ENTREGA'      // Condições de entrega
  | 'CERTIDAO_TECNICA'   // Atestados de capacidade técnica
  | 'DOCUMENTACAO'       // Documentos obrigatórios
  | 'OUTRO';

/**
 * Níveis hierárquicos da estrutura do documento
 */
export type DocumentSectionLevel = 
  | 'CHAPTER' 
  | 'SECTION' 
  | 'CLAUSE' 
  | 'SUBCLAUSE' 
  | 'ITEM';

/**
 * Tipos de relacionamento entre entidades
 */
export type EntityRelationship =
  | 'DEPENDS_ON'      // Depende de outra entidade
  | 'TRIGGERS'        // Dispara/ativa outra entidade
  | 'SAME_DATE'       // Mesmo prazo/data
  | 'SAME_VALUE'      // Mesmo valor
  | 'PREREQUISITE'    // Pré-requisito para
  | 'CONSEQUENCE'     // Consequência de
  | 'PENALTY_FOR'     // Penalidade associada a
  | 'REQUIRED_BY';    // Requerido por

/**
 * Níveis de importância
 */
export type ImportanceLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Níveis de probabilidade (para riscos)
 */
export type ProbabilityLevel = 'CERTAIN' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY';

/**
 * Tipo de data no timeline
 */
export type DateType = 'FIXED' | 'RELATIVE' | 'RANGE';

/**
 * Responsável por uma obrigação
 */
export type ResponsibleParty = 'LICITANTE' | 'ORGAO' | 'AMBOS';

// ============================================================================
// ESTRUTURA DE PÁGINAS
// ============================================================================

/**
 * Representa uma página de um documento no MongoDB
 */
export interface DocumentPage {
  _id?: ObjectId;
  
  /** Identificador único da página */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** Número da página no documento */
  pageNumber: number;
  
  /** Conteúdo textual da página */
  text: string;
  
  /** Contagem de palavras da página */
  wordCount: number;
  
  /** Número do batch que processou esta página */
  batchNumber?: number;
  
  /** Status do processamento */
  status: PageStatus;
  
  /** Tempo de processamento em milissegundos */
  processingTimeMs?: number;
  
  /** Quantidade de entidades extraídas da página */
  entitiesExtracted: number;
  
  /** Mensagem de erro se o processamento falhou */
  error?: string;
  
  /** Data de criação do registro */
  createdAt: Date;
  
  /** Data de conclusão do processamento */
  completedAt?: Date;
}

// ============================================================================
// ESTRUTURA HIERÁRQUICA DO DOCUMENTO
// ============================================================================

/**
 * Representa uma seção/capítulo na estrutura hierárquica do documento
 */
export interface DocumentSection {
  _id?: ObjectId;
  
  /** Identificador único da seção */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** Nível hierárquico */
  level: DocumentSectionLevel;
  
  /** ID da seção pai (para hierarquia) */
  parentId?: string;
  
  /** Ordem dentro do pai */
  order: number;
  
  /** Título da seção */
  title: string;
  
  /** Numeração (ex: "1.2.3", "Art. 5º") */
  number?: string;
  
  /** Resumo gerado pela IA */
  summary?: string;
  
  /** Páginas onde a seção aparece */
  sourcePages: number[];
  
  /** Linha inicial no texto */
  startLine?: number;
  
  /** Linha final no texto */
  endLine?: number;
  
  /** Data de criação */
  createdAt: Date;
}

// ============================================================================
// RASTREABILIDADE (SOURCES)
// ============================================================================

/**
 * Fonte/origem de onde uma informação foi extraída
 */
export interface EntitySource {
  /** Número da página */
  pageNumber: number;
  
  /** Linha inicial */
  lineStart?: number;
  
  /** Linha final */
  lineEnd?: number;
  
  /** Trecho do texto (max 300 chars) */
  excerpt: string;
  
  /** Confiança desta fonte específica */
  confidence: number;
}

/**
 * Referência de onde a entidade foi encontrada no documento
 * @deprecated Use EntitySource instead
 */
export interface DocumentReference {
  pageNumber: number;
  sectionTitle?: string;
  lineStart?: number;
  lineEnd?: number;
  excerptText: string;
}

// ============================================================================
// ENTIDADES
// ============================================================================

/**
 * Detalhes específicos para entidades do tipo OBRIGACAO
 */
export interface ObligationDetails {
  /** Ação a ser tomada */
  action: string;
  
  /** Quem é responsável */
  responsible: ResponsibleParty;
  
  /** Se é obrigatória */
  mandatory: boolean;
  
  /** ID do prazo vinculado */
  linkedDeadlineId?: string;
}

/**
 * Relacionamento entre entidades
 */
export interface EntityRelation {
  /** ID da entidade relacionada */
  entityId: string;
  
  /** Tipo do relacionamento */
  relationship: EntityRelationship;
}

/**
 * Entidade extraída de um edital (versão refatorada)
 */
export interface ExtractedEntity {
  _id?: ObjectId;
  
  /** Identificador único da entidade */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** Tipo da entidade */
  type: EntityType;
  
  /** Chave semântica única para deduplicação */
  semanticKey: string;
  
  /** Nome legível da entidade */
  name: string;
  
  /** Valor bruto extraído do texto */
  rawValue: string;
  
  /** Valor normalizado para comparação/unificação */
  normalizedValue: string;
  
  /** ID da seção do documento onde aparece */
  sectionId?: string;
  
  /** ID da entidade pai (para hierarquia de entidades) */
  parentEntityId?: string;
  
  /** Metadados específicos por tipo */
  metadata: Record<string, unknown>;
  
  /** Detalhes específicos para OBRIGACAO */
  obligationDetails?: ObligationDetails;
  
  /** Fontes/origens no documento */
  sources: EntitySource[];
  
  /** Relacionamentos com outras entidades */
  relatedEntities: EntityRelation[];
  
  /** Confiança da extração (0-1) */
  confidence: number;
  
  /** Data de criação */
  createdAt: Date;
  
  /** Data de última atualização */
  updatedAt: Date;
}

// ============================================================================
// TIMELINE (CRONOGRAMA)
// ============================================================================

/**
 * Referência temporal relativa
 */
export interface RelativeTimeReference {
  /** ID do evento de referência */
  eventId: string;
  
  /** Offset (quantidade) */
  offset: number;
  
  /** Unidade de tempo */
  unit: 'DAYS' | 'BUSINESS_DAYS' | 'MONTHS';
  
  /** Direção (antes ou depois) */
  direction: 'BEFORE' | 'AFTER';
}

/**
 * Penalidade vinculada a um evento do timeline
 */
export interface LinkedPenalty {
  /** ID da entidade de penalidade */
  entityId: string;
  
  /** Tipo da penalidade */
  type: 'MULTA' | 'SANCAO';
  
  /** Descrição resumida */
  description: string;
  
  /** Valor (se aplicável) */
  value?: string;
}

/**
 * Requisito vinculado a um evento do timeline
 */
export interface LinkedRequirement {
  /** ID da entidade de requisito */
  entityId: string;
  
  /** Tipo do requisito */
  type: 'REQUISITO' | 'CERTIDAO_TECNICA' | 'DOCUMENTACAO';
  
  /** Descrição resumida */
  description: string;
  
  /** Se é obrigatório */
  mandatory: boolean;
}

/**
 * Obrigação vinculada a um evento do timeline
 */
export interface LinkedObligation {
  /** ID da entidade de obrigação */
  entityId: string;
  
  /** Descrição resumida */
  description: string;
  
  /** Ação requerida */
  actionRequired: string;
}

/**
 * Metadados de urgência para destaques visuais
 */
export interface UrgencyMetadata {
  /** Dias até o deadline (calculado em runtime) */
  daysUntilDeadline?: number;
  
  /** Se tem penalidade associada */
  hasPenalty: boolean;
  
  /** Valor da penalidade (se houver) */
  penaltyAmount?: string;
  
  /** Se bloqueia outros prazos */
  blockingForOthers: boolean;
}

/**
 * Evento do cronograma/timeline
 */
export interface TimelineEvent {
  _id?: ObjectId;
  
  /** Identificador único do evento */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** Data do evento (null se relativa não resolvida) */
  date: Date | null;
  
  /** Data como aparece no documento */
  dateRaw: string;
  
  /** Tipo da data */
  dateType: DateType;
  
  /** Referência relativa (se dateType === 'RELATIVE') */
  relativeTo?: RelativeTimeReference;
  
  /** Tipo do evento (sugerido pela IA) */
  eventType: string;
  
  /** Título do evento */
  title: string;
  
  /** Descrição detalhada */
  description: string;
  
  /** Nível de importância */
  importance: ImportanceLevel;
  
  /** Ação requerida do licitante */
  actionRequired?: string;
  
  /** Penalidades vinculadas */
  linkedPenalties: LinkedPenalty[];
  
  /** Requisitos vinculados */
  linkedRequirements: LinkedRequirement[];
  
  /** Obrigações vinculadas */
  linkedObligations: LinkedObligation[];
  
  /** IDs dos riscos vinculados */
  linkedRiskIds: string[];
  
  /** Metadados de urgência para UI */
  urgency: UrgencyMetadata;
  
  /** Tags para filtros (ex: 'ENTREGA', 'HABILITACAO') */
  tags: string[];
  
  /** ID da entidade fonte (PRAZO ou DATA) */
  sourceEntityId: string;
  
  /** Páginas de origem */
  sourcePages: number[];
  
  /** Ordem semântica para ordenação (baseado na fase do processo) */
  semanticOrder?: number;
  
  /** Fase do processo licitatório */
  phase?: string;
  
  /** Quantidade de comentários */
  commentsCount: number;
  
  /** Data de criação */
  createdAt: Date;
}

// ============================================================================
// RISCOS
// ============================================================================

/**
 * Ação de mitigação de risco
 */
export interface RiskMitigation {
  /** Ação a ser tomada */
  action: string;
  
  /** Prazo para mitigação */
  deadline?: string;
  
  /** Custo estimado */
  cost?: string;
}

/**
 * Fonte de um risco
 */
export interface RiskSource {
  /** Número da página */
  pageNumber: number;
  
  /** Trecho do texto */
  excerpt: string;
  
  /** Confiança */
  confidence: number;
}

/**
 * Risco identificado no edital
 */
export interface Risk {
  _id?: ObjectId;
  
  /** Identificador único do risco */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** Categoria do risco (sugerida pela IA) */
  category: string;
  
  /** Subcategoria */
  subcategory?: string;
  
  /** Título do risco */
  title: string;
  
  /** Descrição detalhada */
  description: string;
  
  /** O que ativa/dispara o risco */
  trigger: string;
  
  /** Consequência se o risco se materializar */
  consequence: string;
  
  /** Gravidade/severidade */
  severity: ImportanceLevel;
  
  /** Probabilidade de ocorrência */
  probability: ProbabilityLevel;
  
  /** Ação de mitigação sugerida */
  mitigation?: RiskMitigation;
  
  /** IDs das entidades relacionadas */
  linkedEntityIds: string[];
  
  /** IDs dos eventos do timeline relacionados */
  linkedTimelineIds: string[];
  
  /** IDs das seções do documento relacionadas */
  linkedSectionIds: string[];
  
  /** Fontes/origens no documento */
  sources: RiskSource[];
  
  /** Data de criação */
  createdAt: Date;
}

// ============================================================================
// TIPOS AUXILIARES PARA PROCESSAMENTO
// ============================================================================

/**
 * Conflito detectado durante unificação de entidades
 */
export interface EntityConflict {
  /** Chave semântica da entidade em conflito */
  semanticKey: string;
  
  /** Entidade existente no banco */
  existingEntity: ExtractedEntity;
  
  /** Nova entidade sendo processada */
  incomingEntity: ExtractedEntity;
  
  /** Tipo do conflito */
  conflictType: 'VALUE_MISMATCH' | 'METADATA_CONFLICT';
  
  /** Resolução aplicada */
  resolution: 'KEPT_EXISTING' | 'REPLACED_WITH_INCOMING' | 'MERGED';
  
  /** Timestamp do conflito */
  detectedAt: Date;
}

/**
 * Resultado da unificação de entidades
 */
export interface UnificationResult {
  /** Entidades após unificação */
  entities: ExtractedEntity[];
  
  /** Número de entidades novas criadas */
  created: number;
  
  /** Número de entidades atualizadas */
  updated: number;
  
  /** Número de conflitos resolvidos */
  conflictsResolved: number;
  
  /** Detalhes dos conflitos */
  conflicts: EntityConflict[];
}

/**
 * Entidade bruta extraída pela IA (antes da normalização)
 */
export interface RawExtractedEntity {
  type: EntityType;
  name: string;
  rawValue: string;
  semanticKey: string;
  metadata: Record<string, unknown>;
  confidence: number;
  pageNumber: number;
  pageId: string;
  sectionId?: string;
  sectionTitle?: string;
  excerptText: string;
  
  /** Para OBRIGACAO */
  obligationDetails?: {
    action: string;
    responsible: ResponsibleParty;
    mandatory: boolean;
    linkedDeadlineKey?: string;
  };
  
  /** Relacionamentos identificados */
  relatedSemanticKeys?: Array<{
    semanticKey: string;
    relationship: EntityRelationship;
  }>;
}

/**
 * Seção bruta extraída pela IA
 */
export interface RawDocumentSection {
  level: DocumentSectionLevel;
  title: string;
  number?: string;
  summary?: string;
  parentNumber?: string;
  pageNumber: number;
  lineStart?: number;
  lineEnd?: number;
}

/**
 * Evento bruto extraído pela IA
 */
export interface RawTimelineEvent {
  dateRaw: string;
  dateType: DateType;
  dateNormalized?: string;
  eventType: string;
  title: string;
  description: string;
  importance: ImportanceLevel;
  actionRequired?: string;
  tags: string[];
  
  /** Referência relativa (se aplicável) */
  relativeTo?: {
    eventSemanticKey: string;
    offset: number;
    unit: 'DAYS' | 'BUSINESS_DAYS' | 'MONTHS';
    direction: 'BEFORE' | 'AFTER';
  };
  
  /** Semantic keys relacionadas */
  linkedPenaltyKeys?: string[];
  linkedRequirementKeys?: string[];
  linkedObligationKeys?: string[];
  linkedRiskKeys?: string[];
  
  sourceSemanticKey: string;
  pageNumber: number;
  excerpt: string;
  confidence: number;
}

/**
 * Risco bruto extraído pela IA
 */
export interface RawRisk {
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  trigger: string;
  consequence: string;
  severity: ImportanceLevel;
  probability: ProbabilityLevel;
  
  mitigation?: {
    action: string;
    deadline?: string;
    cost?: string;
  };
  
  linkedEntityKeys?: string[];
  linkedTimelineKeys?: string[];
  
  pageNumber: number;
  excerpt: string;
  confidence: number;
}

/**
 * Resultado da extração de uma página/batch
 */
export interface BatchExtractionResult {
  batchNumber: number;
  pagesProcessed: number[];
  
  /** Seções identificadas */
  sections: RawDocumentSection[];
  
  /** Entidades extraídas */
  entities: RawExtractedEntity[];
  
  /** Eventos do timeline */
  timelineEvents: RawTimelineEvent[];
  
  /** Riscos identificados */
  risks: RawRisk[];
  
  /** Referências cruzadas entre entidades */
  crossReferences?: Array<{
    entity1SemanticKey: string;
    entity2SemanticKey: string;
    relationship: EntityRelationship;
  }>;
}

// ============================================================================
// CONFIGURAÇÃO DE PROCESSAMENTO
// ============================================================================

/**
 * Configuração de processamento de documento
 */
export interface ProcessingConfig {
  /** Limite de palavras por batch */
  wordCap: number;
  
  /** Máximo de páginas por batch (fallback) */
  maxPagesPerBatch: number;
  
  /** Nível de concorrência */
  concurrency: number;
  
  /** Tentativas de retry */
  retryAttempts: number;
}

/**
 * Configuração padrão
 */
export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  wordCap: 5000,
  maxPagesPerBatch: 10,
  concurrency: 5,
  retryAttempts: 2,
};

// ============================================================================
// METADADOS ESPECÍFICOS POR TIPO (compatibilidade)
// ============================================================================

/**
 * Metadados específicos para entidades do tipo PRAZO
 */
export interface PrazoMetadata {
  dataInicio?: string;
  dataFim?: string;
  horaLimite?: string;
  tipoEvento: string;
  diasUteis?: boolean;
  duracaoDias?: number;
}

/**
 * Metadados específicos para entidades do tipo MULTA
 */
export interface MultaMetadata {
  percentual?: number;
  valorFixo?: number;
  tipoInfracao: string;
  baseCalculo?: string;
  condicaoAplicacao?: string;
}

/**
 * Metadados específicos para entidades do tipo REQUISITO
 */
export interface RequisitoMetadata {
  categoria: 'TECNICO' | 'HABILITACAO' | 'FISCAL' | 'JURIDICO' | 'ECONOMICO' | 'OUTRO';
  obrigatorio: boolean;
  itemRelacionado?: string;
  especificacao?: string;
}

/**
 * Metadados específicos para entidades do tipo REGRA_ENTREGA
 */
export interface RegraEntregaMetadata {
  localEntrega?: string;
  prazoEntrega?: string;
  condicoesTransporte?: string;
  embalagem?: string;
  horarioRecebimento?: string;
}

/**
 * Metadados específicos para entidades do tipo RISCO (inline entity)
 */
export interface RiscoMetadata {
  tipoRisco: 'SANCAO' | 'IMPEDIMENTO' | 'PENALIDADE' | 'DESCLASSIFICACAO' | 'OUTRO';
  gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  condicaoAtivacao?: string;
}

/**
 * Metadados específicos para entidades do tipo CERTIDAO_TECNICA
 */
export interface CertidaoTecnicaMetadata {
  tipoCertidao: string;
  emissor?: string;
  validadeMinima?: string;
  quantidadeMinima?: number;
  descricaoExigencia?: string;
}

/**
 * Metadados específicos para entidades do tipo DOCUMENTACAO
 */
export interface DocumentacaoMetadata {
  tipoDocumento: 'DECLARACAO' | 'CERTIDAO' | 'ATESTADO' | 'CONTRATO_SOCIAL' | 'PROCURACAO' | 'OUTRO';
  prazoValidade?: string;
  emissor?: string;
  finalidade?: string;
}

/**
 * @deprecated Use DocumentacaoMetadata
 */
export type DocumentacaoObrigatoriaMetadata = DocumentacaoMetadata;

// ============================================================================
// COMENTÁRIOS DO TIMELINE
// ============================================================================

/**
 * Comentário em um evento do timeline
 */
export interface TimelineComment {
  _id?: ObjectId;
  
  /** Identificador único do comentário */
  id: string;
  
  /** ID do evento do timeline */
  timelineEventId: string;
  
  /** ID do documento */
  documentId: string;
  
  /** Conteúdo do comentário */
  content: string;
  
  /** Autor do comentário (pode ser email ou nome) */
  author: string;
  
  /** Data de criação */
  createdAt: Date;
  
  /** Data de última atualização */
  updatedAt: Date;
}

// ============================================================================
// ORDENAÇÃO SEMÂNTICA DO TIMELINE
// ============================================================================

/**
 * Fases do processo licitatório para ordenação semântica
 */
export type LicitacaoPhase =
  | 'PUBLICACAO'           // 1. Publicação do edital
  | 'ESCLARECIMENTOS'      // 2. Pedidos de esclarecimento
  | 'IMPUGNACAO'           // 3. Impugnação
  | 'CADASTRO'             // 4. Cadastro/registro
  | 'ENVIO_PROPOSTA'       // 5. Envio de propostas
  | 'ABERTURA_PROPOSTAS'   // 6. Abertura das propostas
  | 'SESSAO_PUBLICA'       // 7. Sessão pública
  | 'LANCES'               // 8. Fase de lances
  | 'JULGAMENTO'           // 9. Julgamento
  | 'HABILITACAO'          // 10. Habilitação
  | 'RECURSOS'             // 11. Recursos
  | 'ADJUDICACAO'          // 12. Adjudicação
  | 'HOMOLOGACAO'          // 13. Homologação
  | 'ASSINATURA'           // 14. Assinatura do contrato
  | 'EXECUCAO'             // 15. Execução/Entrega
  | 'PAGAMENTO'            // 16. Pagamento
  | 'GARANTIA'             // 17. Garantia
  | 'OUTRO';               // 99. Outros

/**
 * Mapeamento de fases para ordem numérica
 */
export const PHASE_ORDER: Record<LicitacaoPhase, number> = {
  PUBLICACAO: 1,
  ESCLARECIMENTOS: 2,
  IMPUGNACAO: 3,
  CADASTRO: 4,
  ENVIO_PROPOSTA: 5,
  ABERTURA_PROPOSTAS: 6,
  SESSAO_PUBLICA: 7,
  LANCES: 8,
  JULGAMENTO: 9,
  HABILITACAO: 10,
  RECURSOS: 11,
  ADJUDICACAO: 12,
  HOMOLOGACAO: 13,
  ASSINATURA: 14,
  EXECUCAO: 15,
  PAGAMENTO: 16,
  GARANTIA: 17,
  OUTRO: 99,
};

/**
 * Mapeamento de eventType para fase do processo
 */
export const EVENT_TYPE_TO_PHASE: Record<string, LicitacaoPhase> = {
  // Publicação
  PUBLICACAO: 'PUBLICACAO',
  PUBLICACAO_EDITAL: 'PUBLICACAO',
  
  // Esclarecimentos
  ESCLARECIMENTO: 'ESCLARECIMENTOS',
  PEDIDO_ESCLARECIMENTO: 'ESCLARECIMENTOS',
  
  // Impugnação
  IMPUGNACAO: 'IMPUGNACAO',
  IMPUGNACAO_EDITAL: 'IMPUGNACAO',
  
  // Cadastro
  CADASTRO: 'CADASTRO',
  CREDENCIAMENTO: 'CADASTRO',
  
  // Envio de proposta
  ENVIO_PROPOSTA: 'ENVIO_PROPOSTA',
  PROPOSTA: 'ENVIO_PROPOSTA',
  FIM_ENVIO_PROPOSTA: 'ENVIO_PROPOSTA',
  
  // Abertura
  ABERTURA_PROPOSTAS: 'ABERTURA_PROPOSTAS',
  ABERTURA: 'ABERTURA_PROPOSTAS',
  
  // Sessão pública
  SESSAO_PUBLICA: 'SESSAO_PUBLICA',
  SESSAO: 'SESSAO_PUBLICA',
  PREGAO: 'SESSAO_PUBLICA',
  
  // Lances
  FASE_LANCES: 'LANCES',
  LANCES: 'LANCES',
  
  // Julgamento
  JULGAMENTO: 'JULGAMENTO',
  ANALISE_PROPOSTA: 'JULGAMENTO',
  
  // Habilitação
  HABILITACAO: 'HABILITACAO',
  ENTREGA_DOCUMENTOS: 'HABILITACAO',
  AMOSTRA: 'HABILITACAO',
  
  // Recursos
  RECURSO: 'RECURSOS',
  CONTRARRAZOES: 'RECURSOS',
  
  // Adjudicação
  ADJUDICACAO: 'ADJUDICACAO',
  
  // Homologação
  HOMOLOGACAO: 'HOMOLOGACAO',
  
  // Assinatura
  ASSINATURA_CONTRATO: 'ASSINATURA',
  ASSINATURA: 'ASSINATURA',
  VIGENCIA_CONTRATO: 'ASSINATURA',
  
  // Execução/Entrega
  ENTREGA_OBJETO: 'EXECUCAO',
  ENTREGA: 'EXECUCAO',
  EXECUCAO: 'EXECUCAO',
  
  // Pagamento
  PAGAMENTO: 'PAGAMENTO',
  
  // Garantia
  GARANTIA: 'GARANTIA',
  
  // Default
  OUTRO: 'OUTRO',
};

/**
 * Retorna a fase do processo baseado no eventType
 */
export function getPhaseFromEventType(eventType: string): LicitacaoPhase {
  const normalized = eventType.toUpperCase().replace(/\s+/g, '_');
  return EVENT_TYPE_TO_PHASE[normalized] || 'OUTRO';
}

/**
 * Retorna a ordem numérica baseado no eventType
 */
export function getSemanticOrder(eventType: string): number {
  const phase = getPhaseFromEventType(eventType);
  return PHASE_ORDER[phase];
}
