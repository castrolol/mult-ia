import { ObjectId } from 'mongodb';
import pdfParse from 'pdf-parse';
import { getDatabase } from '../services/database.js';
import { downloadFile } from '../services/storage.js';
import { analyzeDocumentWithAI } from '../ai/agent.js';
import { getEntityUnificationService } from '../services/entity-unification.js';
import type { PDFDocument, ProcessJobData } from '../types/index.js';

interface PageContent {
  pageNumber: number;
  text: string;
}

/**
 * Extrai texto de cada página do PDF
 */
async function extractPagesFromPDF(buffer: Buffer): Promise<PageContent[]> {
  const data = await pdfParse(buffer);
  
  // pdf-parse retorna o texto completo, mas podemos dividir por páginas
  // usando o número de páginas e tentando dividir o texto
  const totalPages = data.numpages;
  const fullText = data.text;
  
  // Estratégia simples: dividir o texto proporcionalmente
  // Em produção, usar pdfjs-dist para extração página por página mais precisa
  const pages: PageContent[] = [];
  
  if (totalPages === 1) {
    pages.push({ pageNumber: 1, text: fullText });
  } else {
    // Tenta dividir por marcadores de página comuns ou proporcionalmente
    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / totalPages);
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * linesPerPage;
      const end = Math.min(start + linesPerPage, lines.length);
      const pageText = lines.slice(start, end).join('\n').trim();
      
      if (pageText) {
        pages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }
    }
  }
  
  return pages;
}

/**
 * Atualiza o status do documento no MongoDB
 */
async function updateDocumentStatus(
  documentId: string,
  status: PDFDocument['status'],
  updates: Partial<PDFDocument> = {}
): Promise<void> {
  const db = getDatabase();
  
  await db.collection<PDFDocument>('documents').updateOne(
    { _id: new ObjectId(documentId) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...updates,
      },
    }
  );
}

/**
 * Processa um documento PDF (edital de licitação)
 * - Baixa do Minio
 * - Extrai texto por página
 * - Analisa com IA para extrair entidades
 * - Unifica e deduplica entidades
 */
export async function processDocument(data: ProcessJobData): Promise<void> {
  const { documentId, s3Key } = data;
  const unificationService = getEntityUnificationService();
  
  console.log(`\n📄 Processando edital: ${documentId}`);
  console.log(`   S3 Key: ${s3Key}`);
  
  try {
    // Atualizar status para PROCESSING
    await updateDocumentStatus(documentId, 'PROCESSING');
    
    // Limpar entidades anteriores deste documento (reprocessamento)
    const clearedCount = await unificationService.clearDocumentEntities(documentId);
    if (clearedCount > 0) {
      console.log(`   🗑️ ${clearedCount} entidades anteriores removidas`);
    }
    
    // 1. Baixar PDF do Minio
    console.log('   → Baixando PDF do storage...');
    const pdfBuffer = await downloadFile(s3Key);
    console.log(`   ✓ PDF baixado (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    // 2. Extrair texto por página
    console.log('   → Extraindo texto das páginas...');
    const pages = await extractPagesFromPDF(pdfBuffer);
    console.log(`   ✓ ${pages.length} página(s) extraída(s)`);
    
    // Atualizar total de páginas
    await updateDocumentStatus(documentId, 'PROCESSING', {
      totalPages: pages.length,
    });
    
    // 3. Analisar documento completo com IA
    console.log('   → Analisando edital com IA...\n');
    
    const analysisResult = await analyzeDocumentWithAI(pages, documentId);
    
    // 4. Atualizar status final
    const finalStatus: PDFDocument['status'] = analysisResult.success 
      ? 'COMPLETED' 
      : 'FAILED';
    
    await updateDocumentStatus(documentId, finalStatus);
    
    console.log(`\n✅ Edital processado com sucesso!`);
    console.log(`   Páginas analisadas: ${analysisResult.pagesAnalyzed}/${analysisResult.totalPages}`);
    console.log(`   Entidades extraídas: ${analysisResult.totalEntities}`);
    
    if (Object.keys(analysisResult.entitiesByType).length > 0) {
      console.log(`   Distribuição por tipo:`);
      for (const [type, count] of Object.entries(analysisResult.entitiesByType)) {
        console.log(`     - ${type}: ${count}`);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Erro ao processar edital ${documentId}:`, error);
    
    // Atualizar status para FAILED
    await updateDocumentStatus(documentId, 'FAILED', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    
    // Não re-lança o erro para não derrubar a fila
  }
}
