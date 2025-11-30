import crypto from 'crypto';
import { getDatabase } from './database.js';
import type {
  DocumentSection,
  DocumentSectionLevel,
  RawDocumentSection,
} from '../types/entities.js';

/**
 * Gera um ID único para uma seção
 */
function generateSectionId(): string {
  return crypto.randomUUID();
}

/**
 * Serviço para gerenciar a estrutura hierárquica de documentos
 * Responsável por criar e manter a árvore de seções/capítulos
 */
export class DocumentStructureService {
  private db = getDatabase();
  private collection = this.db.collection<DocumentSection>('document_structure');

  /**
   * Cria uma nova seção no documento
   */
  async createSection(
    documentId: string,
    data: {
      level: DocumentSectionLevel;
      parentId?: string;
      order: number;
      title: string;
      number?: string;
      summary?: string;
      sourcePages: number[];
      startLine?: number;
      endLine?: number;
    }
  ): Promise<DocumentSection> {
    const section: DocumentSection = {
      id: generateSectionId(),
      documentId,
      ...data,
      createdAt: new Date(),
    };

    await this.collection.insertOne(section);
    return section;
  }

  /**
   * Processa seções brutas extraídas pela IA e cria a estrutura hierárquica
   */
  async processSections(
    documentId: string,
    rawSections: RawDocumentSection[]
  ): Promise<DocumentSection[]> {
    const createdSections: DocumentSection[] = [];
    
    // Mapear números para IDs para resolver parentId
    const numberToId: Map<string, string> = new Map();
    
    // Ordenar por nível e número para garantir que pais sejam criados antes
    const sortedSections = [...rawSections].sort((a, b) => {
      const levelOrder: Record<DocumentSectionLevel, number> = {
        CHAPTER: 1,
        SECTION: 2,
        CLAUSE: 3,
        SUBCLAUSE: 4,
        ITEM: 5,
      };
      return levelOrder[a.level] - levelOrder[b.level];
    });

    let orderIndex = 0;
    for (const raw of sortedSections) {
      // Encontrar o pai baseado no parentNumber
      let parentId: string | undefined;
      if (raw.parentNumber) {
        parentId = numberToId.get(raw.parentNumber);
      }
      
      const section = await this.createSection(documentId, {
        level: raw.level,
        parentId,
        order: orderIndex,
        title: raw.title,
        number: raw.number,
        summary: raw.summary,
        sourcePages: [raw.pageNumber],
        startLine: raw.lineStart,
        endLine: raw.lineEnd,
      });

      createdSections.push(section);
      
      // Registrar o número para referência de filhos
      if (raw.number) {
        numberToId.set(raw.number, section.id);
      }
      
      orderIndex++;
    }

    return createdSections;
  }

  /**
   * Busca todas as seções de um documento
   */
  async getSectionsByDocumentId(documentId: string): Promise<DocumentSection[]> {
    return this.collection
      .find({ documentId })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Busca seções por nível
   */
  async getSectionsByLevel(
    documentId: string,
    level: DocumentSectionLevel
  ): Promise<DocumentSection[]> {
    return this.collection
      .find({ documentId, level })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Busca seções filhas de um pai
   */
  async getChildSections(
    documentId: string,
    parentId: string
  ): Promise<DocumentSection[]> {
    return this.collection
      .find({ documentId, parentId })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Busca seções raiz (sem pai)
   */
  async getRootSections(documentId: string): Promise<DocumentSection[]> {
    return this.collection
      .find({ documentId, parentId: { $exists: false } })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Busca uma seção pelo número (ex: "1.2.3", "Art. 5º")
   */
  async getSectionByNumber(
    documentId: string,
    number: string
  ): Promise<DocumentSection | null> {
    return this.collection.findOne({ documentId, number });
  }

  /**
   * Busca uma seção pelo ID
   */
  async getSectionById(sectionId: string): Promise<DocumentSection | null> {
    return this.collection.findOne({ id: sectionId });
  }

  /**
   * Atualiza o resumo de uma seção
   */
  async updateSummary(sectionId: string, summary: string): Promise<void> {
    await this.collection.updateOne(
      { id: sectionId },
      { $set: { summary } }
    );
  }

  /**
   * Adiciona uma página às fontes de uma seção
   */
  async addSourcePage(sectionId: string, pageNumber: number): Promise<void> {
    await this.collection.updateOne(
      { id: sectionId },
      { $addToSet: { sourcePages: pageNumber } }
    );
  }

  /**
   * Constrói a árvore hierárquica completa
   */
  async getHierarchyTree(documentId: string): Promise<DocumentSectionNode[]> {
    const allSections = await this.getSectionsByDocumentId(documentId);
    
    // Criar mapa de seções por ID
    const sectionMap = new Map<string, DocumentSection>();
    for (const section of allSections) {
      sectionMap.set(section.id, section);
    }
    
    // Construir árvore
    const rootNodes: DocumentSectionNode[] = [];
    const childrenMap = new Map<string, DocumentSectionNode[]>();
    
    for (const section of allSections) {
      const node: DocumentSectionNode = {
        ...section,
        children: [],
      };
      
      if (!section.parentId) {
        rootNodes.push(node);
      } else {
        if (!childrenMap.has(section.parentId)) {
          childrenMap.set(section.parentId, []);
        }
        childrenMap.get(section.parentId)!.push(node);
      }
    }
    
    // Função recursiva para anexar filhos
    const attachChildren = (node: DocumentSectionNode) => {
      const children = childrenMap.get(node.id) || [];
      node.children = children;
      for (const child of children) {
        attachChildren(child);
      }
    };
    
    for (const root of rootNodes) {
      attachChildren(root);
    }
    
    return rootNodes;
  }

  /**
   * Busca o caminho completo até uma seção (breadcrumb)
   */
  async getSectionPath(sectionId: string): Promise<DocumentSection[]> {
    const path: DocumentSection[] = [];
    let currentId: string | undefined = sectionId;
    
    while (currentId) {
      const section = await this.getSectionById(currentId);
      if (!section) break;
      
      path.unshift(section);
      currentId = section.parentId;
    }
    
    return path;
  }

  /**
   * Remove todas as seções de um documento
   */
  async clearDocumentSections(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }

  /**
   * Obtém estatísticas da estrutura do documento (otimizado)
   */
  async getStructureStats(documentId: string): Promise<{
    totalSections: number;
    byLevel: Record<DocumentSectionLevel, number>;
    maxDepth: number;
  }> {
    const sections = await this.getSectionsByDocumentId(documentId);
    
    const byLevel: Record<DocumentSectionLevel, number> = {
      CHAPTER: 0,
      SECTION: 0,
      CLAUSE: 0,
      SUBCLAUSE: 0,
      ITEM: 0,
    };
    
    // Criar mapa de seções por ID para calcular profundidade em memória
    const sectionMap = new Map<string, DocumentSection>();
    for (const section of sections) {
      byLevel[section.level]++;
      sectionMap.set(section.id, section);
    }
    
    // Calcular profundidade máxima em memória (sem N queries)
    let maxDepth = 0;
    for (const section of sections) {
      let depth = 1;
      let current = section;
      while (current.parentId && sectionMap.has(current.parentId)) {
        depth++;
        current = sectionMap.get(current.parentId)!;
      }
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return {
      totalSections: sections.length,
      byLevel,
      maxDepth,
    };
  }
}

/**
 * Nó da árvore hierárquica (seção com filhos)
 */
export interface DocumentSectionNode extends DocumentSection {
  children: DocumentSectionNode[];
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: DocumentStructureService | null = null;

export function getDocumentStructureService(): DocumentStructureService {
  if (!serviceInstance) {
    serviceInstance = new DocumentStructureService();
  }
  return serviceInstance;
}

