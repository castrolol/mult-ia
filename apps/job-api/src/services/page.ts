import crypto from 'crypto';
import { getDatabase } from './database.js';
import type { DocumentPage, PageStatus } from '../types/entities.js';

/**
 * Gera um ID único para uma página
 */
function generatePageId(): string {
  return crypto.randomUUID();
}

/**
 * Conta palavras em um texto
 */
function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Serviço para gerenciar a collection de páginas de documentos
 * Responsável por rastrear o processamento de cada página
 */
export class PageService {
  private db = getDatabase();
  private collection = this.db.collection<DocumentPage>('pages');

  /**
   * Cria registros de páginas para um documento
   * Retorna os registros criados com seus IDs
   */
  async createPages(
    documentId: string,
    pages: Array<{ pageNumber: number; text: string }>
  ): Promise<DocumentPage[]> {
    const now = new Date();
    
    const pageRecords: DocumentPage[] = pages.map((page) => ({
      id: generatePageId(),
      documentId,
      pageNumber: page.pageNumber,
      text: page.text,
      wordCount: countWords(page.text),
      status: 'pending' as PageStatus,
      entitiesExtracted: 0,
      createdAt: now,
    }));

    if (pageRecords.length > 0) {
      await this.collection.insertMany(pageRecords);
    }

    return pageRecords;
  }

  /**
   * Atualiza o status de uma página
   */
  async updatePageStatus(
    pageId: string,
    status: PageStatus,
    options?: {
      processingTimeMs?: number;
      entitiesExtracted?: number;
      error?: string;
    }
  ): Promise<void> {
    const updateData: Partial<DocumentPage> = {
      status,
    };

    if (options?.processingTimeMs !== undefined) {
      updateData.processingTimeMs = options.processingTimeMs;
    }

    if (options?.entitiesExtracted !== undefined) {
      updateData.entitiesExtracted = options.entitiesExtracted;
    }

    if (options?.error !== undefined) {
      updateData.error = options.error;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await this.collection.updateOne(
      { id: pageId },
      { $set: updateData }
    );
  }

  /**
   * Marca uma página como em processamento
   */
  async markAsProcessing(pageId: string): Promise<void> {
    await this.updatePageStatus(pageId, 'processing');
  }

  /**
   * Marca uma página como concluída com sucesso
   */
  async markAsCompleted(
    pageId: string,
    processingTimeMs: number,
    entitiesExtracted: number
  ): Promise<void> {
    await this.updatePageStatus(pageId, 'completed', {
      processingTimeMs,
      entitiesExtracted,
    });
  }

  /**
   * Marca uma página como falha
   */
  async markAsFailed(
    pageId: string,
    error: string,
    processingTimeMs?: number
  ): Promise<void> {
    await this.updatePageStatus(pageId, 'failed', {
      processingTimeMs,
      error,
    });
  }

  /**
   * Atualiza o número do batch que processou a página
   */
  async updateBatchNumber(pageId: string, batchNumber: number): Promise<void> {
    await this.collection.updateOne(
      { id: pageId },
      { $set: { batchNumber } }
    );
  }

  /**
   * Busca todas as páginas de um documento
   */
  async getPagesByDocumentId(documentId: string): Promise<DocumentPage[]> {
    return this.collection
      .find({ documentId })
      .sort({ pageNumber: 1 })
      .toArray();
  }

  /**
   * Busca uma página pelo ID
   */
  async getPageById(pageId: string): Promise<DocumentPage | null> {
    return this.collection.findOne({ id: pageId });
  }

  /**
   * Busca uma página pelo documentId e número
   */
  async getPageByNumber(
    documentId: string,
    pageNumber: number
  ): Promise<DocumentPage | null> {
    return this.collection.findOne({ documentId, pageNumber });
  }

  /**
   * Obtém estatísticas de processamento de um documento
   */
  async getProcessingStats(documentId: string): Promise<{
    totalPages: number;
    completedPages: number;
    failedPages: number;
    pendingPages: number;
    processingPages: number;
    totalProcessingTimeMs: number;
    averageProcessingTimeMs: number;
    totalEntitiesExtracted: number;
  }> {
    const pages = await this.getPagesByDocumentId(documentId);
    
    const stats = {
      totalPages: pages.length,
      completedPages: 0,
      failedPages: 0,
      pendingPages: 0,
      processingPages: 0,
      totalProcessingTimeMs: 0,
      averageProcessingTimeMs: 0,
      totalEntitiesExtracted: 0,
    };

    for (const page of pages) {
      switch (page.status) {
        case 'completed':
          stats.completedPages++;
          break;
        case 'failed':
          stats.failedPages++;
          break;
        case 'pending':
          stats.pendingPages++;
          break;
        case 'processing':
          stats.processingPages++;
          break;
      }

      if (page.processingTimeMs) {
        stats.totalProcessingTimeMs += page.processingTimeMs;
      }
      
      stats.totalEntitiesExtracted += page.entitiesExtracted;
    }

    if (stats.completedPages > 0) {
      stats.averageProcessingTimeMs = 
        stats.totalProcessingTimeMs / stats.completedPages;
    }

    return stats;
  }

  /**
   * Remove todas as páginas de um documento
   */
  async clearDocumentPages(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }
}

// Singleton para reutilização
let serviceInstance: PageService | null = null;

export function getPageService(): PageService {
  if (!serviceInstance) {
    serviceInstance = new PageService();
  }
  return serviceInstance;
}

