export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ProcessJobData {
  documentId: string
  s3Key: string
}

