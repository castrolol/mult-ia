import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../services/database.js';
import { getDocumentStructureService } from '../services/document-structure.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import type { PDFDocument, DocumentSection } from '../types/index.js';

const structure = new Hono();

/**
 * GET /structure/:documentId
 * Retorna a estrutura hierárquica completa do documento em formato de árvore
 */
structure.get('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const db = getDatabase();
    const structureService = getDocumentStructureService();
    
    // Verificar se documento existe
    const doc = await db.collection<PDFDocument>('documents').findOne({
      _id: new ObjectId(documentId),
    });
    
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404);
    }
    
    // Buscar árvore hierárquica
    const tree = await structureService.getHierarchyTree(documentId);
    
    // Estatísticas
    const stats = await structureService.getStructureStats(documentId);
    
    return c.json({
      documentId,
      filename: doc.filename,
      
      // Árvore hierárquica
      tree: tree.map(formatSectionNode),
      
      // Estatísticas
      stats: {
        totalSections: stats.totalSections,
        byLevel: stats.byLevel,
        maxDepth: stats.maxDepth,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estrutura:', error);
    return c.json({ error: 'Erro ao buscar estrutura' }, 500);
  }
});

/**
 * GET /structure/:documentId/flat
 * Retorna a estrutura em formato flat (lista)
 */
structure.get('/:documentId/flat', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const level = c.req.query('level'); // Filtrar por nível
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const structureService = getDocumentStructureService();
    
    let sections: DocumentSection[];
    
    if (level) {
      sections = await structureService.getSectionsByLevel(
        documentId, 
        level.toUpperCase() as DocumentSection['level']
      );
    } else {
      sections = await structureService.getSectionsByDocumentId(documentId);
    }
    
    return c.json({
      documentId,
      sections: sections.map(formatSection),
      total: sections.length,
    });
  } catch (error) {
    console.error('Erro ao buscar estrutura flat:', error);
    return c.json({ error: 'Erro ao buscar estrutura' }, 500);
  }
});

/**
 * GET /structure/:documentId/sections/:sectionId
 * Retorna detalhes de uma seção específica
 */
structure.get('/:documentId/sections/:sectionId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const sectionId = c.req.param('sectionId');
    
    const structureService = getDocumentStructureService();
    const entityService = getEntityUnificationService();
    
    // Buscar seção
    const section = await structureService.getSectionById(sectionId);
    
    if (!section || section.documentId !== documentId) {
      return c.json({ error: 'Seção não encontrada' }, 404);
    }
    
    // Buscar caminho (breadcrumb)
    const path = await structureService.getSectionPath(sectionId);
    
    // Buscar seções filhas
    const children = await structureService.getChildSections(documentId, sectionId);
    
    // Buscar entidades vinculadas a esta seção
    const entities = await entityService.findBySectionId(sectionId);
    
    return c.json({
      ...formatSection(section),
      
      // Breadcrumb (caminho até a seção)
      breadcrumb: path.map(s => ({
        id: s.id,
        number: s.number,
        title: s.title,
        level: s.level,
      })),
      
      // Seções filhas
      children: children.map(formatSection),
      
      // Entidades vinculadas
      entities: entities.map(e => ({
        id: e.id,
        type: e.type,
        name: e.name,
        semanticKey: e.semanticKey,
      })),
      
      childrenCount: children.length,
      entitiesCount: entities.length,
    });
  } catch (error) {
    console.error('Erro ao buscar seção:', error);
    return c.json({ error: 'Erro ao buscar seção' }, 500);
  }
});

/**
 * GET /structure/:documentId/sections/:sectionId/children
 * Retorna filhos diretos de uma seção
 */
structure.get('/:documentId/sections/:sectionId/children', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const sectionId = c.req.param('sectionId');
    
    const structureService = getDocumentStructureService();
    
    const children = await structureService.getChildSections(documentId, sectionId);
    
    return c.json({
      parentId: sectionId,
      children: children.map(formatSection),
      total: children.length,
    });
  } catch (error) {
    console.error('Erro ao buscar filhos:', error);
    return c.json({ error: 'Erro ao buscar filhos' }, 500);
  }
});

/**
 * GET /structure/:documentId/root
 * Retorna apenas seções raiz (sem pai)
 */
structure.get('/:documentId/root', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    if (!ObjectId.isValid(documentId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }
    
    const structureService = getDocumentStructureService();
    
    const roots = await structureService.getRootSections(documentId);
    
    return c.json({
      documentId,
      sections: roots.map(formatSection),
      total: roots.length,
    });
  } catch (error) {
    console.error('Erro ao buscar raízes:', error);
    return c.json({ error: 'Erro ao buscar raízes' }, 500);
  }
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formata uma seção para resposta da API
 */
function formatSection(section: DocumentSection) {
  return {
    id: section.id,
    level: section.level,
    number: section.number,
    title: section.title,
    summary: section.summary,
    parentId: section.parentId,
    order: section.order,
    sourcePages: section.sourcePages,
    createdAt: section.createdAt,
  };
}

interface SectionNode extends DocumentSection {
  children?: SectionNode[];
}

/**
 * Formata um nó da árvore hierárquica (recursivo)
 */
function formatSectionNode(node: SectionNode): unknown {
  return {
    id: node.id,
    level: node.level,
    number: node.number,
    title: node.title,
    summary: node.summary,
    order: node.order,
    sourcePages: node.sourcePages,
    children: node.children?.map(formatSectionNode) || [],
  };
}

export { structure };

