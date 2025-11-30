// Hooks de documentos
export {
  useDocuments,
  useDocument,
  useDocumentPdfUrl,
  useUploadDocument,
  useProcessDocument,
  documentKeys,
} from './use-documents'

// Hooks de timeline
export {
  useTimeline,
  useTimelineByPhase,
  useTimelineCritical,
  useTimelineEvent,
  timelineKeys,
} from './use-timeline'

// Hooks de estrutura
export {
  useStructure,
  useStructureFlat,
  useStructureRoot,
  useSection,
  useSectionChildren,
  structureKeys,
} from './use-structure'

// Hooks de comentários
export {
  useComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useCommentsManager,
  commentKeys,
} from './use-comments'

// Hooks de riscos
export {
  useRisks,
  useRisksCritical,
  useRisksByCategory,
  useRisk,
  riskKeys,
} from './use-risks'

// Hooks de posição de texto no PDF
export {
  useTextPosition,
  usePrefetchPositions,
  type EntityPositionData,
  type UseTextPositionResult,
} from './use-text-position'

// Hooks de chat RAG
export {
  useRagStatus,
  usePrepareRag,
  useConversations,
  useConversation,
  useCreateConversation,
  useSendMessage,
  useUpdateConversationTitle,
  useDeleteConversation,
} from './use-chat'