import type { ObjectId } from 'mongodb';

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

export interface ProcessJobData {
  documentId: string;
  s3Key: string;
}

export interface Entity {
  _id?: ObjectId;
  id: string;
  name: string;
  description: string;
  value: string;
  type: string;
  parentId?: string;
}

export interface GlobalContext {
  _id?: ObjectId;
  key: string;
  value: unknown;
  description?: string;
}

export interface PageAnalysis {
  _id?: ObjectId;
  documentId: string;
  pageNumber: number;
  summary: string;
  entities: string[];
  facts: string[];
  createdAt: Date;
}

