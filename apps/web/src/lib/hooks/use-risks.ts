'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient, type ImportanceLevel } from '../api-client'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const riskKeys = {
  all: ['risks'] as const,
  document: (documentId: string) => [...riskKeys.all, documentId] as const,
  list: (
    documentId: string,
    params?: { category?: string; severity?: ImportanceLevel; sortBy?: string },
  ) => [...riskKeys.document(documentId), 'list', params] as const,
  critical: (documentId: string) =>
    [...riskKeys.document(documentId), 'critical'] as const,
  byCategory: (documentId: string) =>
    [...riskKeys.document(documentId), 'byCategory'] as const,
  detail: (documentId: string, riskId: string) =>
    [...riskKeys.document(documentId), 'detail', riskId] as const,
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para obter riscos de um documento
 */
export function useRisks(
  documentId: string | undefined,
  params?: {
    category?: string
    severity?: ImportanceLevel
    sortBy?: string
  },
) {
  return useQuery({
    queryKey: riskKeys.list(documentId || '', params),
    queryFn: () => apiClient.getRisks(documentId!, params),
    enabled: !!documentId,
    select: (data) => ({
      risks: data.risks || [],
      stats: data.stats,
    }),
  })
}

/**
 * Hook para obter riscos críticos
 */
export function useRisksCritical(documentId: string | undefined) {
  return useQuery({
    queryKey: riskKeys.critical(documentId || ''),
    queryFn: () => apiClient.getRisksCritical(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      risks: data.risks || [],
      total: data.total,
    }),
  })
}

/**
 * Hook para obter riscos agrupados por categoria
 */
export function useRisksByCategory(documentId: string | undefined) {
  return useQuery({
    queryKey: riskKeys.byCategory(documentId || ''),
    queryFn: () => apiClient.getRisksByCategory(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      categories: data.categories || [],
    }),
  })
}

/**
 * Hook para obter detalhes de um risco
 */
export function useRisk(
  documentId: string | undefined,
  riskId: string | undefined,
) {
  return useQuery({
    queryKey: riskKeys.detail(documentId || '', riskId || ''),
    queryFn: () => apiClient.getRisk(documentId!, riskId!),
    enabled: !!documentId && !!riskId,
  })
}
