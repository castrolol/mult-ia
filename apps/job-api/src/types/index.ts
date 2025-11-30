import type { ObjectId } from 'mongodb';

// Re-exportar tipos de entidades
export * from './entities.js';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Configuração de processamento do documento
 */
export interface DocumentConfig {
  /** Limite de palavras por batch (default: 8000) */
  wordCap: number;
  
  /** Máximo de páginas por batch (fallback) */
  maxPagesPerBatch: number;
}

/**
 * Documento PDF de edital
 */
export interface PDFDocument {
  _id?: ObjectId;
  
  /** Nome do arquivo */
  filename: string;
  
  /** Chave no S3/Minio */
  s3Key: string;
  
  /** Status do processamento */
  status: DocumentStatus;
  
  /** Total de páginas do documento */
  totalPages: number;
  
  /** Páginas já processadas */
  pagesProcessed: number;
  
  /** Batch atual em processamento */
  currentBatch: number;
  
  /** Total de batches calculados */
  totalBatches: number;
  
  /** Configuração de processamento */
  config: DocumentConfig;
  
  /** Timestamp de início do processamento */
  processingStartedAt?: Date;
  
  /** Timestamp de conclusão do processamento */
  processingCompletedAt?: Date;
  
  /** Mensagem de erro (se houver) */
  error?: string;
  
  /** Data de criação */
  createdAt: Date;
  
  /** Data de última atualização */
  updatedAt: Date;
}

export interface PageAnalysis {
  _id?: ObjectId;
  documentId: ObjectId;
  pageNumber: number;
  rawText: string;
  analysis: string;
  facts: string[];
  createdAt: Date;
}

export interface GlobalContext {
  _id?: ObjectId;
  key: string;
  value: unknown;
  description?: string;
}

export interface ProcessJobData {
  documentId: string;
  s3Key: string;
  config?: Partial<DocumentConfig>;
}
