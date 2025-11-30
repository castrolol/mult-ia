'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api-client'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const commentKeys = {
  all: ['comments'] as const,
  event: (documentId: string, eventId: string) =>
    [...commentKeys.all, documentId, eventId] as const,
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para obter comentários de um evento
 */
export function useComments(
  documentId: string | undefined,
  eventId: string | undefined,
) {
  return useQuery({
    queryKey: commentKeys.event(documentId || '', eventId || ''),
    queryFn: () => apiClient.getComments(documentId!, eventId!),
    enabled: !!documentId && !!eventId,
    select: (data) => ({
      comments: data.comments || [],
      total: data.total,
    }),
  })
}

/**
 * Hook para adicionar comentário
 */
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      eventId,
      content,
      author,
    }: {
      documentId: string
      eventId: string
      content: string
      author: string
    }) => apiClient.addComment(documentId, eventId, content, author),
    onSuccess: (_, { documentId, eventId }) => {
      // Invalidar comentários do evento
      queryClient.invalidateQueries({
        queryKey: commentKeys.event(documentId, eventId),
      })
    },
  })
}

/**
 * Hook para atualizar comentário
 */
export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      eventId,
      commentId,
      content,
    }: {
      documentId: string
      eventId: string
      commentId: string
      content: string
    }) => apiClient.updateComment(documentId, eventId, commentId, content),
    onSuccess: (_, { documentId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.event(documentId, eventId),
      })
    },
  })
}

/**
 * Hook para excluir comentário
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      eventId,
      commentId,
    }: {
      documentId: string
      eventId: string
      commentId: string
    }) => apiClient.deleteComment(documentId, eventId, commentId),
    onSuccess: (_, { documentId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.event(documentId, eventId),
      })
    },
  })
}

/**
 * Hook combinado para gerenciar comentários com todas as operações CRUD
 */
export function useCommentsManager(
  documentId: string | undefined,
  eventId: string | undefined,
) {
  const { data, isLoading, error, refetch } = useComments(documentId, eventId)
  const addMutation = useAddComment()
  const updateMutation = useUpdateComment()
  const deleteMutation = useDeleteComment()

  const add = async (content: string, author: string) => {
    if (!documentId || !eventId) return null
    return addMutation.mutateAsync({ documentId, eventId, content, author })
  }

  const update = async (commentId: string, content: string) => {
    if (!documentId || !eventId) return null
    return updateMutation.mutateAsync({ documentId, eventId, commentId, content })
  }

  const remove = async (commentId: string) => {
    if (!documentId || !eventId) return false
    await deleteMutation.mutateAsync({ documentId, eventId, commentId })
    return true
  }

  return {
    comments: data?.comments || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    add,
    update,
    remove,
    isOperating:
      addMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  }
}
