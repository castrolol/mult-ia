import type { ObjectId } from 'mongodb';

// Re-exportar tipos de entidades
export * from './entities.js';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PDFDocument {
  _id?: ObjectId;
  filename: string;
  s3Key: string;
  status: DocumentStatus;
  totalPages?: number;
  error?: string;
  createdAt: Date;
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
}

