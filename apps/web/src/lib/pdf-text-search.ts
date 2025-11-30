'use client'

// pdfjs-dist é importado dinamicamente para evitar SSR com canvas
const PDFJS_VERSION = '3.11.174'
const WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null

/**
 * Carrega pdfjs-dist dinamicamente (apenas no cliente)
 */
async function loadPdfjs() {
  if (pdfjsLib) return pdfjsLib

  // Importação dinâmica para evitar SSR
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL
  pdfjsLib = pdfjs
  return pdfjs
}

/**
 * Representa a posição de um texto no PDF em porcentagem
 */
export interface TextPosition {
  /** Índice da página (0-indexed) */
  pageIndex: number
  /** Posição horizontal em % da largura */
  left: number
  /** Posição vertical em % da altura */
  top: number
  /** Largura em % da página */
  width: number
  /** Altura em % da página */
  height: number
}

/**
 * Item de texto extraído do PDF com suas coordenadas
 */
interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

/**
 * Cache de documentos PDF já carregados
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfDocumentCache = new Map<string, any>()

/**
 * Carrega um documento PDF (com cache)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfDocument(pdfUrl: string): Promise<any> {
  if (pdfDocumentCache.has(pdfUrl)) {
    return pdfDocumentCache.get(pdfUrl)!
  }

  const pdfjs = await loadPdfjs()
  const loadingTask = pdfjs.getDocument(pdfUrl)
  const pdfDocument = await loadingTask.promise
  pdfDocumentCache.set(pdfUrl, pdfDocument)

  return pdfDocument
}

/**
 * Normaliza texto para comparação (remove espaços extras, quebras de linha, etc)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

/**
 * Calcula a similaridade entre dois textos (0 a 1)
 * Usa distância de Levenshtein simplificada
 */
function textSimilarity(a: string, b: string): number {
  const normalA = normalizeText(a)
  const normalB = normalizeText(b)

  if (normalA === normalB) return 1
  if (normalA.length === 0 || normalB.length === 0) return 0

  // Verifica se um contém o outro
  if (normalA.includes(normalB) || normalB.includes(normalA)) {
    return 0.9
  }

  // Calcula similaridade por palavras em comum
  const wordsA = new Set(normalA.split(' '))
  const wordsB = new Set(normalB.split(' '))
  const intersection = [...wordsA].filter(w => wordsB.has(w))
  const union = new Set([...wordsA, ...wordsB])

  return intersection.length / union.size
}

/**
 * Busca a posição de um texto em uma página específica do PDF
 * 
 * @param pdfUrl - URL do PDF
 * @param pageNumber - Número da página (1-indexed)
 * @param searchText - Texto a ser buscado
 * @param fuzzyMatch - Se deve usar matching aproximado (default: true)
 * @returns Array de posições encontradas ou null se não encontrar
 */
export async function findTextPosition(
  pdfUrl: string,
  pageNumber: number,
  searchText: string,
  fuzzyMatch = true
): Promise<TextPosition[] | null> {
  try {
    const pdfDocument = await loadPdfDocument(pdfUrl)
    const pageIndex = pageNumber - 1

    // Valida número da página
    if (pageIndex < 0 || pageIndex >= pdfDocument.numPages) {
      console.warn(`Página ${pageNumber} inválida. PDF tem ${pdfDocument.numPages} páginas.`)
      return null
    }

    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    const pageWidth = viewport.width
    const pageHeight = viewport.height

    const normalizedSearch = normalizeText(searchText)
    const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2)

    const positions: TextPosition[] = []

    // Agrupa items de texto consecutivos para formar frases
    const textItems = textContent.items as TextItem[]
    let currentLine = ''
    let lineItems: TextItem[] = []
    let lastY = -1

    for (const item of textItems) {
      if (!item.str || item.str.trim() === '') continue

      const y = item.transform[5]

      // Se mudou de linha, processa a linha anterior
      if (lastY !== -1 && Math.abs(y - lastY) > 5) {
        const matchResult = findMatchInLine(
          currentLine,
          lineItems,
          normalizedSearch,
          searchWords,
          pageWidth,
          pageHeight,
          pageIndex,
          fuzzyMatch
        )
        if (matchResult) {
          positions.push(...matchResult)
        }
        currentLine = ''
        lineItems = []
      }

      currentLine += item.str + ' '
      lineItems.push(item)
      lastY = y
    }

    // Processa última linha
    if (currentLine) {
      const matchResult = findMatchInLine(
        currentLine,
        lineItems,
        normalizedSearch,
        searchWords,
        pageWidth,
        pageHeight,
        pageIndex,
        fuzzyMatch
      )
      if (matchResult) {
        positions.push(...matchResult)
      }
    }

    // Se não encontrou na página específica e fuzzyMatch está ativo, 
    // busca em páginas adjacentes
    if (positions.length === 0 && fuzzyMatch) {
      const adjacentPages = [pageNumber - 1, pageNumber + 1].filter(
        p => p >= 1 && p <= pdfDocument.numPages
      )

      for (const adjPage of adjacentPages) {
        const adjPositions = await findTextPosition(pdfUrl, adjPage, searchText, false)
        if (adjPositions && adjPositions.length > 0) {
          return adjPositions
        }
      }
    }

    return positions.length > 0 ? positions : null
  } catch (error) {
    console.error('Erro ao buscar posição do texto:', error)
    return null
  }
}

/**
 * Busca match em uma linha de texto e retorna posições
 */
function findMatchInLine(
  lineText: string,
  lineItems: TextItem[],
  normalizedSearch: string,
  searchWords: string[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number,
  fuzzyMatch: boolean
): TextPosition[] | null {
  const normalizedLine = normalizeText(lineText)

  // Match exato
  if (normalizedLine.includes(normalizedSearch)) {
    return createPositionsFromItems(lineItems, pageWidth, pageHeight, pageIndex)
  }

  // Match fuzzy: verifica se a maioria das palavras estão presentes
  if (fuzzyMatch && searchWords.length > 0) {
    const matchedWords = searchWords.filter(word => normalizedLine.includes(word))
    const matchRatio = matchedWords.length / searchWords.length

    // Considera match se 70% das palavras estiverem presentes
    if (matchRatio >= 0.7) {
      return createPositionsFromItems(lineItems, pageWidth, pageHeight, pageIndex)
    }
  }

  return null
}

/**
 * Cria posições a partir de items de texto
 */
function createPositionsFromItems(
  items: TextItem[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number
): TextPosition[] {
  if (items.length === 0) return []

  // Calcula bounding box de todos os items
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const item of items) {
    const x = item.transform[4]
    const y = item.transform[5]
    const itemWidth = item.width || 0
    const itemHeight = item.height || 10

    minX = Math.min(minX, x)
    minY = Math.min(minY, y - itemHeight)
    maxX = Math.max(maxX, x + itemWidth)
    maxY = Math.max(maxY, y)
  }

  // Converte para porcentagem
  // PDF.js usa sistema de coordenadas com origem no canto inferior esquerdo
  // Precisamos converter para origem no canto superior esquerdo
  const left = (minX / pageWidth) * 100
  const top = ((pageHeight - maxY) / pageHeight) * 100
  const width = ((maxX - minX) / pageWidth) * 100
  const height = ((maxY - minY) / pageHeight) * 100

  // Adiciona margem para melhor visualização
  const margin = 0.5

  return [{
    pageIndex,
    left: Math.max(0, left - margin),
    top: Math.max(0, top - margin),
    width: Math.min(100 - left, width + margin * 2),
    height: Math.min(100 - top, height + margin * 2),
  }]
}

/**
 * Busca múltiplos textos em um documento PDF
 * Útil para pré-carregar posições de várias entidades de uma vez
 */
export async function findMultipleTextPositions(
  pdfUrl: string,
  searches: Array<{
    id: string
    pageNumber: number
    searchText: string
  }>
): Promise<Map<string, TextPosition[] | null>> {
  const results = new Map<string, TextPosition[] | null>()

  // Pré-carrega o documento uma vez
  await loadPdfDocument(pdfUrl)

  // Busca em paralelo (limitado a 5 concurrent para não sobrecarregar)
  const chunkSize = 5
  for (let i = 0; i < searches.length; i += chunkSize) {
    const chunk = searches.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(
      chunk.map(async (search) => {
        const positions = await findTextPosition(
          pdfUrl,
          search.pageNumber,
          search.searchText
        )
        return { id: search.id, positions }
      })
    )

    for (const result of chunkResults) {
      results.set(result.id, result.positions)
    }
  }

  return results
}

/**
 * Limpa o cache de documentos PDF
 * Útil para liberar memória quando o documento não é mais necessário
 */
export function clearPdfCache(pdfUrl?: string): void {
  if (pdfUrl) {
    const doc = pdfDocumentCache.get(pdfUrl)
    if (doc) {
      doc.destroy()
      pdfDocumentCache.delete(pdfUrl)
    }
  } else {
    // Limpa todo o cache
    for (const [url, doc] of pdfDocumentCache) {
      doc.destroy()
      pdfDocumentCache.delete(url)
    }
  }
}

