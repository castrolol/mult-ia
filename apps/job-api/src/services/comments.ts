import crypto from 'crypto';
import { getDatabase } from './database.js';
import type { TimelineComment } from '../types/entities.js';

/**
 * Gera um ID único para um comentário
 */
function generateCommentId(): string {
  return crypto.randomUUID();
}

/**
 * Serviço para gerenciar comentários em eventos do timeline
 */
export class CommentsService {
  private db = getDatabase();
  private collection = this.db.collection<TimelineComment>('timeline_comments');
  private timelineCollection = this.db.collection('timeline_events');

  /**
   * Cria um novo comentário
   */
  async createComment(data: {
    timelineEventId: string;
    documentId: string;
    content: string;
    author: string;
  }): Promise<TimelineComment> {
    const now = new Date();
    
    const comment: TimelineComment = {
      id: generateCommentId(),
      timelineEventId: data.timelineEventId,
      documentId: data.documentId,
      content: data.content,
      author: data.author,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.insertOne(comment);
    
    // Atualizar contagem de comentários no evento
    await this.updateCommentCount(data.timelineEventId);

    return comment;
  }

  /**
   * Atualiza um comentário existente
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<TimelineComment | null> {
    const result = await this.collection.findOneAndUpdate(
      { id: commentId },
      { 
        $set: { 
          content,
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Remove um comentário
   */
  async deleteComment(commentId: string): Promise<boolean> {
    const comment = await this.collection.findOne({ id: commentId });
    
    if (!comment) {
      return false;
    }

    await this.collection.deleteOne({ id: commentId });
    
    // Atualizar contagem de comentários no evento
    await this.updateCommentCount(comment.timelineEventId);

    return true;
  }

  /**
   * Busca comentários por evento do timeline
   */
  async getCommentsByEventId(timelineEventId: string): Promise<TimelineComment[]> {
    return this.collection
      .find({ timelineEventId })
      .sort({ createdAt: 1 })
      .toArray();
  }

  /**
   * Busca comentários por documento
   */
  async getCommentsByDocumentId(documentId: string): Promise<TimelineComment[]> {
    return this.collection
      .find({ documentId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Busca comentário por ID
   */
  async getCommentById(commentId: string): Promise<TimelineComment | null> {
    return this.collection.findOne({ id: commentId });
  }

  /**
   * Conta comentários de um evento
   */
  async countCommentsByEventId(timelineEventId: string): Promise<number> {
    return this.collection.countDocuments({ timelineEventId });
  }

  /**
   * Atualiza a contagem de comentários no evento do timeline
   */
  private async updateCommentCount(timelineEventId: string): Promise<void> {
    const count = await this.countCommentsByEventId(timelineEventId);
    
    await this.timelineCollection.updateOne(
      { id: timelineEventId },
      { $set: { commentsCount: count } }
    );
  }

  /**
   * Remove todos os comentários de um documento
   */
  async clearDocumentComments(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Remove todos os comentários de um evento
   */
  async clearEventComments(timelineEventId: string): Promise<number> {
    const result = await this.collection.deleteMany({ timelineEventId });
    
    // Atualizar contagem no evento
    await this.timelineCollection.updateOne(
      { id: timelineEventId },
      { $set: { commentsCount: 0 } }
    );
    
    return result.deletedCount;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: CommentsService | null = null;

export function getCommentsService(): CommentsService {
  if (!serviceInstance) {
    serviceInstance = new CommentsService();
  }
  return serviceInstance;
}

