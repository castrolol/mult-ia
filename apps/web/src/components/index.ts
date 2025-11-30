/**
 * Componentes do Frontend
 * Re-exporta todos os componentes para facilitar imports
 */

export { DocumentViewer } from './document-viewer'
export { PDFUploader } from './pdf-uploader'
// PdfViewer usa dynamic import internamente via document-viewer
export type { PdfHighlightData } from './pdf-viewer'
export { HierarchyTree, SectionDetail } from './hierarchy-tree'
export { TimelineView, TimelineByPhase, EventDetail } from './timeline-view'
export { CommentsPanel, CommentsInline } from './comments-panel'

