'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { positionCache } from '../pdf-position-cache'

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

// Importação dinâmica para evitar SSR com canvas
type FindTextPositionFn = (
  pdfUrl: string,
  pageNumber: number,
  searchText: string,
  fuzzyMatch?: boolean
) => Promise<TextPosition[] | null>

let findTextPositionFn: FindTextPositionFn | null = null

async function getFindTextPosition(): Promise<FindTextPositionFn | null> {
  // Só importa no cliente
  if (typeof window === 'undefined') {
    return null
  }
  
  if (findTextPositionFn) return findTextPositionFn
  const module = await import('../pdf-text-search')
  findTextPositionFn = module.findTextPosition
  return findTextPositionFn
}

/**
 * Dados da entidade para buscar posição
 */
export interface EntityPositionData {
  /** ID único da entidade */
  id: string
  /** Número da página (1-indexed) */
  pageNumber: number
  /** Texto fonte para buscar no PDF */
  sourceText: string
}

/**
 * Resultado do hook useTextPosition
 */
export interface UseTextPositionResult {
  /** Posições encontradas para a entidade selecionada */
  positions: TextPosition[] | null
  /** Indica se está carregando */
  isLoading: boolean
  /** Erro se houver */
  error: Error | null
  /** Força recarga da posição (ignora cache) */
  refetch: () => Promise<void>
  /** Limpa o cache do documento */
  clearCache: () => Promise<void>
}

/**
 * Hook para buscar e cachear posição de texto de uma entidade no PDF
 * 
 * @param documentId - ID do documento
 * @param pdfUrl - URL do PDF (pode ser null/undefined enquanto carrega)
 * @param entity - Dados da entidade (pode ser null se nenhuma selecionada)
 * @returns Posições, estado de loading e funções utilitárias
 * 
 * @example
 * ```tsx
 * const { positions, isLoading } = useTextPosition(
 *   documentId,
 *   pdfUrl,
 *   selectedEntity ? {
 *     id: selectedEntity.id,
 *     pageNumber: selectedEntity.pageNumber,
 *     sourceText: selectedEntity.sourceText
 *   } : null
 * )
 * ```
 */
export function useTextPosition(
  documentId: string | undefined,
  pdfUrl: string | null | undefined,
  entity: EntityPositionData | null
): UseTextPositionResult {
  const [positions, setPositions] = useState<TextPosition[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Ref para controlar requisições em voo
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastEntityIdRef = useRef<string | null>(null)

  /**
   * Busca posição no cache ou no PDF
   */
  const fetchPosition = useCallback(async (
    ignoreCache = false
  ): Promise<void> => {
    // Valida parâmetros
    if (!documentId || !pdfUrl || !entity) {
      setPositions(null)
      setError(null)
      return
    }

    // Cancela requisição anterior se ainda estiver em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Cria novo controller para esta requisição
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      // Verifica cache primeiro (se não for forçar recarga)
      if (!ignoreCache) {
        const cachedPositions = await positionCache.get(documentId, entity.id)
        
        // Verifica se a requisição foi cancelada
        if (controller.signal.aborted) return

        if (cachedPositions) {
          setPositions(cachedPositions)
          setIsLoading(false)
          return
        }
      }

      // Valida sourceText
      if (!entity.sourceText || entity.sourceText.trim().length < 3) {
        setPositions(null)
        setIsLoading(false)
        return
      }

      // Busca no PDF (importação dinâmica, só no cliente)
      const findTextPosition = await getFindTextPosition()
      if (!findTextPosition) {
        setIsLoading(false)
        return
      }
      
      const foundPositions = await findTextPosition(
        pdfUrl,
        entity.pageNumber,
        entity.sourceText
      )

      // Verifica se a requisição foi cancelada
      if (controller.signal.aborted) return

      if (foundPositions) {
        // Salva no cache
        await positionCache.set(documentId, entity.id, foundPositions)
        setPositions(foundPositions)
      } else {
        setPositions(null)
      }
    } catch (err) {
      // Ignora erros de requisições canceladas
      if (controller.signal.aborted) return

      console.error('Erro ao buscar posição do texto:', err)
      setError(err instanceof Error ? err : new Error('Erro desconhecido'))
      setPositions(null)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [documentId, pdfUrl, entity])

  /**
   * Força recarga ignorando cache
   */
  const refetch = useCallback(async () => {
    await fetchPosition(true)
  }, [fetchPosition])

  /**
   * Limpa cache do documento
   */
  const clearCache = useCallback(async () => {
    if (documentId) {
      await positionCache.clearDocument(documentId)
      setPositions(null)
    }
  }, [documentId])

  // Efeito para buscar posição quando a entidade muda
  useEffect(() => {
    const entityId = entity?.id || null

    // Só busca se a entidade mudou
    if (entityId !== lastEntityIdRef.current) {
      lastEntityIdRef.current = entityId
      
      if (entityId) {
        fetchPosition()
      } else {
        setPositions(null)
        setIsLoading(false)
        setError(null)
      }
    }
  }, [entity?.id, fetchPosition])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    positions,
    isLoading,
    error,
    refetch,
    clearCache,
  }
}

/**
 * Hook para pré-carregar posições de múltiplas entidades
 * Útil para carregar posições em background quando o documento abre
 */
export function usePrefetchPositions(
  documentId: string | undefined,
  pdfUrl: string | null | undefined,
  entities: EntityPositionData[]
): {
  isPreloading: boolean
  progress: number
  preloadedCount: number
} {
  const [isPreloading, setIsPreloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preloadedCount, setPreloadedCount] = useState(0)

  useEffect(() => {
    if (!documentId || !pdfUrl || entities.length === 0) {
      return
    }

    let cancelled = false

    const preload = async () => {
      setIsPreloading(true)
      setProgress(0)
      let loaded = 0

      for (let i = 0; i < entities.length; i++) {
        if (cancelled) break

        const entity = entities[i]
        
        // Verifica se já está no cache
        const cached = await positionCache.get(documentId, entity.id)
        
        if (!cached && entity.sourceText && entity.sourceText.trim().length >= 3) {
          try {
            const findTextPosition = await getFindTextPosition()
            if (!findTextPosition) continue
            
            const positions = await findTextPosition(
              pdfUrl,
              entity.pageNumber,
              entity.sourceText
            )

            if (positions && !cancelled) {
              await positionCache.set(documentId, entity.id, positions)
              loaded++
            }
          } catch (err) {
            // Ignora erros individuais no prefetch
            console.warn(`Erro no prefetch de ${entity.id}:`, err)
          }
        } else if (cached) {
          loaded++
        }

        if (!cancelled) {
          setProgress(((i + 1) / entities.length) * 100)
          setPreloadedCount(loaded)
        }
      }

      if (!cancelled) {
        setIsPreloading(false)
      }
    }

    preload()

    return () => {
      cancelled = true
    }
  }, [documentId, pdfUrl, entities])

  return {
    isPreloading,
    progress,
    preloadedCount,
  }
}

