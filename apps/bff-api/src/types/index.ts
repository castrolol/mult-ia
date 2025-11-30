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

