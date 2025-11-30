'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, type DocumentStatus } from '../api-client'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number; status?: DocumentStatus }) =>
    [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  pdfUrl: (id: string) => [...documentKeys.all, 'pdfUrl', id] as const,
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para listar documentos
 */
export function useDocuments(params?: {
  page?: number
  limit?: number
  status?: DocumentStatus
}) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => apiClient.getDocuments(params),
    select: (data) => ({
      documents: data.documents || [],
      pagination: data.pagination,
    }),
  })
}

/**
 * Hook para obter detalhes de um documento
 */
export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.detail(id || ''),
    queryFn: () => apiClient.getDocument(id!),
    enabled: !!id,
  })
}

/**
 * Hook para obter URL do PDF
 */
export function useDocumentPdfUrl(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.pdfUrl(id || ''),
    queryFn: () => apiClient.getDocumentPdfUrl(id!),
    enabled: !!id,
    // URL expira em 1 hora, então manter fresca por 50 minutos
    staleTime: 50 * 60 * 1000,
  })
}

/**
 * Hook para upload de documento
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => apiClient.uploadDocument(file),
    onSuccess: () => {
      // Invalidar lista de documentos após upload
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook para processar documento
 */
export function useProcessDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => apiClient.processDocument(documentId),
    onSuccess: (_, documentId) => {
      // Invalidar documento específico e lista
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}
