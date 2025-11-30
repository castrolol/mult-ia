'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient, type DocumentSectionLevel } from '../api-client'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const structureKeys = {
  all: ['structure'] as const,
  document: (documentId: string) => [...structureKeys.all, documentId] as const,
  flat: (documentId: string, level?: DocumentSectionLevel) =>
    [...structureKeys.document(documentId), 'flat', level] as const,
  root: (documentId: string) =>
    [...structureKeys.document(documentId), 'root'] as const,
  section: (documentId: string, sectionId: string) =>
    [...structureKeys.document(documentId), 'section', sectionId] as const,
  children: (documentId: string, sectionId: string) =>
    [...structureKeys.document(documentId), 'children', sectionId] as const,
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para obter estrutura hierárquica de um documento
 */
export function useStructure(documentId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.document(documentId || ''),
    queryFn: () => apiClient.getStructure(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      tree: data.tree || [],
      stats: data.stats,
      filename: data.filename,
    }),
  })
}

/**
 * Hook para obter estrutura em formato flat (lista)
 */
export function useStructureFlat(
  documentId: string | undefined,
  level?: DocumentSectionLevel,
) {
  return useQuery({
    queryKey: structureKeys.flat(documentId || '', level),
    queryFn: () => apiClient.getStructureFlat(documentId!, level),
    enabled: !!documentId,
    select: (data) => ({
      sections: data.sections || [],
      total: data.total,
    }),
  })
}

/**
 * Hook para obter seções raiz
 */
export function useStructureRoot(documentId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.root(documentId || ''),
    queryFn: () => apiClient.getStructureRoot(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      sections: data.sections || [],
      total: data.total,
    }),
  })
}

/**
 * Hook para obter detalhes de uma seção
 */
export function useSection(
  documentId: string | undefined,
  sectionId: string | undefined,
) {
  return useQuery({
    queryKey: structureKeys.section(documentId || '', sectionId || ''),
    queryFn: () => apiClient.getSection(documentId!, sectionId!),
    enabled: !!documentId && !!sectionId,
  })
}

/**
 * Hook para obter filhos de uma seção
 */
export function useSectionChildren(
  documentId: string | undefined,
  sectionId: string | undefined,
) {
  return useQuery({
    queryKey: structureKeys.children(documentId || '', sectionId || ''),
    queryFn: () => apiClient.getSectionChildren(documentId!, sectionId!),
    enabled: !!documentId && !!sectionId,
    select: (data) => ({
      children: data.children || [],
      total: data.total,
    }),
  })
}
