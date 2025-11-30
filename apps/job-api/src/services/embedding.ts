import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { getDatabase } from './database.js';
import type { DocumentEmbedding, SimilarityResult, RagStatus } from '../types/rag.js';

/**
 * Calcula a similaridade de cosseno entre dois vetores
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]!;
    const bVal = b[i]!;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Serviço para gerenciar embeddings de documentos
 */
export class EmbeddingService {
  private db = getDatabase();
  private collection = this.db.collection<DocumentEmbedding>('document_embeddings');
  private embeddingModel = openai.embedding('text-embedding-3-small');

  /**
   * Gera embedding para um texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.embeddingModel,
      value: text,
    });

    return embedding;
  }

  /**
   * Gera embeddings para múltiplos textos em batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const { embeddings } = await embedMany({
      model: this.embeddingModel,
      values: texts,
    });

    return embeddings;
  }

  /**
   * Cria embeddings para todas as páginas de um documento
   */
  async createDocumentEmbeddings(
    documentId: string,
    pages: Array<{ id: string; pageNumber: number; text: string }>
  ): Promise<{ created: number; skipped: number }> {
    const now = new Date();
    let created = 0;
    let skipped = 0;

    // Filtrar páginas que já têm embedding
    const existingEmbeddings = await this.collection
      .find({ documentId })
      .project({ pageId: 1 })
      .toArray();

    const existingPageIds = new Set(existingEmbeddings.map(e => e.pageId));

    const pagesToEmbed = pages.filter(p => {
      if (existingPageIds.has(p.id)) {
        skipped++;
        return false;
      }
      // Pular páginas vazias ou muito curtas
      if (!p.text || p.text.trim().length < 50) {
        skipped++;
        return false;
      }
      return true;
    });

    if (pagesToEmbed.length === 0) {
      return { created, skipped };
    }

    // Gerar embeddings em batches de 100 (limite da API)
    const batchSize = 100;
    for (let i = 0; i < pagesToEmbed.length; i += batchSize) {
      const batch = pagesToEmbed.slice(i, i + batchSize);
      const texts = batch.map(p => p.text);

      console.log(`   🔢 Gerando embeddings para páginas ${i + 1}-${Math.min(i + batchSize, pagesToEmbed.length)}...`);

      const embeddings = await this.generateEmbeddings(texts);

      const documents: DocumentEmbedding[] = batch.map((page, idx) => ({
        documentId,
        pageId: page.id,
        pageNumber: page.pageNumber,
        text: page.text,
        embedding: embeddings[idx]!,
        createdAt: now,
      }));

      await this.collection.insertMany(documents);
      created += documents.length;
    }

    return { created, skipped };
  }

  /**
   * Busca páginas mais similares a uma query
   */
  async findSimilarPages(
    documentId: string,
    query: string,
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    // Gerar embedding da query
    const queryEmbedding = await this.generateEmbedding(query);

    // Buscar todos os embeddings do documento
    const pageEmbeddings = await this.collection
      .find({ documentId })
      .toArray();

    if (pageEmbeddings.length === 0) {
      return [];
    }

    // Calcular similaridade para cada página
    const similarities: SimilarityResult[] = pageEmbeddings.map(page => ({
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      text: page.text,
      similarity: cosineSimilarity(queryEmbedding, page.embedding),
    }));

    // Ordenar por similaridade e retornar top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Verifica o status do RAG para um documento
   */
  async getRagStatus(documentId: string, totalPages: number): Promise<RagStatus> {
    const embeddedCount = await this.collection.countDocuments({ documentId });
    const lastEmbedding = await this.collection
      .findOne({ documentId }, { sort: { createdAt: -1 } });

    return {
      documentId,
      isReady: embeddedCount > 0 && embeddedCount >= totalPages * 0.8, // 80% das páginas
      totalPages,
      embeddedPages: embeddedCount,
      lastUpdated: lastEmbedding?.createdAt,
    };
  }

  /**
   * Remove todos os embeddings de um documento
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Verifica se um documento já tem embeddings
   */
  async hasEmbeddings(documentId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ documentId });
    return count > 0;
  }

  /**
   * Conta embeddings de um documento
   */
  async countEmbeddings(documentId: string): Promise<number> {
    return this.collection.countDocuments({ documentId });
  }
}

// Singleton
let serviceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!serviceInstance) {
    serviceInstance = new EmbeddingService();
  }
  return serviceInstance;
}

