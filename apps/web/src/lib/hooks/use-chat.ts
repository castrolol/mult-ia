import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  apiClient,
  type ConversationsListResponse,
  type ConversationDetailResponse,
  type ChatResponse,
  type RagStatus,
} from '../api-client'

/**
 * Hook para buscar status do RAG
 */
export function useRagStatus(documentId: string | undefined) {
  return useQuery<RagStatus>({
    queryKey: ['rag-status', documentId],
    queryFn: () => apiClient.getRagStatus(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      // Refetch a cada 5s se não estiver pronto
      const data = query.state.data
      if (data && !data.isReady) {
        return 5000
      }
      return false
    },
  })
}

/**
 * Hook para preparar RAG (gerar embeddings)
 */
export function usePrepareRag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      regenerate,
    }: {
      documentId: string
      regenerate?: boolean
    }) => apiClient.prepareRag(documentId, regenerate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['rag-status', variables.documentId],
      })
    },
  })
}

/**
 * Hook para listar conversas
 */
export function useConversations(documentId: string | undefined) {
  return useQuery<ConversationsListResponse>({
    queryKey: ['conversations', documentId],
    queryFn: () => apiClient.listConversations(documentId!),
    enabled: !!documentId,
  })
}

/**
 * Hook para buscar detalhes de uma conversa
 */
export function useConversation(
  documentId: string | undefined,
  conversationId: string | undefined,
) {
  return useQuery<ConversationDetailResponse>({
    queryKey: ['conversation', documentId, conversationId],
    queryFn: () => apiClient.getConversation(documentId!, conversationId!),
    enabled: !!documentId && !!conversationId,
  })
}

/**
 * Hook para criar uma nova conversa
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      title,
    }: {
      documentId: string
      title?: string
    }) => apiClient.createConversation(documentId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', variables.documentId],
      })
    },
  })
}

/**
 * Hook para enviar mensagem no chat
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation<
    ChatResponse,
    Error,
    {
      documentId: string
      message: string
      conversationId?: string
      topK?: number
    }
  >({
    mutationFn: ({ documentId, message, conversationId, topK }) =>
      apiClient.sendChatMessage(documentId, message, conversationId, topK),
    onSuccess: (data, variables) => {
      // Invalidar conversas e conversa específica
      queryClient.invalidateQueries({
        queryKey: ['conversations', variables.documentId],
      })
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.documentId, data.conversationId],
        })
      }
    },
  })
}

/**
 * Hook para atualizar título da conversa
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      conversationId,
      title,
    }: {
      documentId: string
      conversationId: string
      title: string
    }) => apiClient.updateConversationTitle(documentId, conversationId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', variables.documentId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'conversation',
          variables.documentId,
          variables.conversationId,
        ],
      })
    },
  })
}

/**
 * Hook para deletar conversa
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      conversationId,
    }: {
      documentId: string
      conversationId: string
    }) => apiClient.deleteConversation(documentId, conversationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', variables.documentId],
      })
    },
  })
}

