import type { ObjectId } from 'mongodb';

/**
 * Status de processamento de uma página
 */
export type PageStatus = 'pending' | 'processing' | 'completed' | 'failed';

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

/**
 * Tipos de entidades extraídas de editais de licitação
 */
export type EntityType =
  | 'PRAZO'
  | 'REGRA_ENTREGA'
  | 'RISCO'
  | 'MULTA'
  | 'REQUISITO'
  | 'CERTIDAO_TECNICA'
  | 'DOCUMENTACAO_OBRIGATORIA';

/**
 * Referência de onde a entidade foi encontrada no documento
 */
export interface DocumentReference {
  pageNumber: number;
  sectionTitle?: string;
  lineStart?: number;
  lineEnd?: number;
  excerptText: string;
}

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
 * Metadados específicos para entidades do tipo RISCO
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
 * Metadados específicos para entidades do tipo DOCUMENTACAO_OBRIGATORIA
 */
export interface DocumentacaoObrigatoriaMetadata {
  tipoDocumento: 'DECLARACAO' | 'CERTIDAO' | 'ATESTADO' | 'CONTRATO_SOCIAL' | 'PROCURACAO' | 'OUTRO';
  prazoValidade?: string;
  emissor?: string;
  finalidade?: string;
}

/**
 * União discriminada de metadados por tipo
 */
export type EntityMetadata =
  | { type: 'PRAZO'; data: PrazoMetadata }
  | { type: 'MULTA'; data: MultaMetadata }
  | { type: 'REQUISITO'; data: RequisitoMetadata }
  | { type: 'REGRA_ENTREGA'; data: RegraEntregaMetadata }
  | { type: 'RISCO'; data: RiscoMetadata }
  | { type: 'CERTIDAO_TECNICA'; data: CertidaoTecnicaMetadata }
  | { type: 'DOCUMENTACAO_OBRIGATORIA'; data: DocumentacaoObrigatoriaMetadata };

/**
 * Entidade extraída de um edital
 */
export interface ExtractedEntity {
  _id?: ObjectId;
  
  /** Identificador único da entidade */
  id: string;
  
  /** ID do documento de origem */
  documentId: string;
  
  /** ID da página de origem */
  pageId: string;
  
  /** Tipo da entidade */
  type: EntityType;
  
  /** Nome legível da entidade */
  name: string;
  
  /** Valor bruto extraído do texto */
  rawValue: string;
  
  /** Valor normalizado para comparação/unificação */
  normalizedValue: string;
  
  /** Chave de deduplicação (hash do tipo + valor normalizado + contexto) */
  deduplicationKey: string;
  
  /** Metadados específicos por tipo */
  metadata: EntityMetadata;
  
  /** Referências no documento onde a entidade aparece */
  references: DocumentReference[];
  
  /** Confiança da extração (0-1) */
  confidence: number;
  
  /** Data de criação */
  createdAt: Date;
  
  /** Data de última atualização */
  updatedAt: Date;
}

/**
 * Conflito detectado durante unificação de entidades
 */
export interface EntityConflict {
  /** Chave semântica da entidade em conflito */
  deduplicationKey: string;
  
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
  
  /** Número de entidades atualizadas (referência adicionada) */
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
  sectionTitle?: string;
  excerptText: string;
}

/**
 * Resultado da extração de uma página
 */
export interface PageExtractionResult {
  pageNumber: number;
  entities: RawExtractedEntity[];
  crossReferences?: Array<{
    entity1SemanticKey: string;
    entity2SemanticKey: string;
    relationship: string;
  }>;
}

