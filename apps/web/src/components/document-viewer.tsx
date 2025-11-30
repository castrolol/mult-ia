'use client'

import type { DocumentSection, TimelineEvent, Risk } from '@/lib/api-client'
import {
  useDocument,
  useDocumentPdfUrl,
  useProcessDocument,
  useStructure,
  useTimeline,
  useRisks,
} from '@/lib/hooks'
import { documentStatus, ui } from '@/lib/i18n'
import { Button } from '@workspace/ui/components/button'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitFork,
  Loader2,
  MessageSquare,
  Play,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { CommentsPanel } from './comments-panel'
import { HierarchyTree } from './hierarchy-tree'
import { TimelineView } from './timeline-view'
import { RiskPanel } from './risk-panel'
import { ChatPanel } from './chat-panel'

// Dynamic import para evitar SSR do PDF.js
const PdfViewerWithStates = dynamic(
  () => import('./pdf-viewer').then((mod) => mod.PdfViewerWithStates),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando visualizador...</p>
        </div>
      </div>
    ),
  }
)

type ViewMode = 'timeline' | 'hierarchy' | 'chat' | 'risks'

type SelectedItemType = 'hierarchy' | 'timeline' | 'risk'

interface SelectedItem {
  type: SelectedItemType
  section?: DocumentSection
  event?: TimelineEvent
  risk?: Risk
}

interface DocumentViewerProps {
  documentId?: string
  documentName?: string
}

export function DocumentViewer({
  documentId,
  documentName: propDocumentName,
}: DocumentViewerProps) {
  const {
    data: document,
    isLoading: docLoading,
    error: docError,
    refetch: refetchDoc,
  } = useDocument(documentId)
  const processMutation = useProcessDocument()
  const {
    data: timelineData,
    isLoading: timelineLoading,
    error: timelineError,
  } = useTimeline(documentId)
  const {
    data: structureData,
    isLoading: structureLoading,
    error: structureError,
  } = useStructure(documentId)
  const {
    data: risksData,
    isLoading: risksLoading,
  } = useRisks(documentId)

  // Buscar URL do PDF apenas quando documento estiver completo
  const shouldFetchPdf = documentId && document?.status === 'COMPLETED'
  const {
    data: pdfData,
    isLoading: pdfLoading,
    error: pdfError,
    refetch: refetchPdf,
  } = useDocumentPdfUrl(shouldFetchPdf ? documentId : undefined)

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [selectedEventForComments, setSelectedEventForComments] =
    useState<TimelineEvent | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null)

  const documentName =
    propDocumentName || document?.filename || 'documento.pdf'
  const statusLabel = document?.status ? documentStatus[document.status] : ''
  // Usar o total de páginas do PDF se disponível, senão do documento
  const totalPages = pdfTotalPages || document?.totalPages || 1

  const handlePdfPageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePdfLoad = (numPages: number) => {
    setPdfTotalPages(numPages)
  }

  const timeline = timelineData?.allEvents || []
  const structure = structureData?.tree || []
  const risksCount = risksData?.stats?.total || 0
  const criticalRisksCount =
    (risksData?.stats?.bySeverity?.CRITICAL || 0) +
    (risksData?.stats?.bySeverity?.HIGH || 0)

  const handleHierarchySelect = (section: DocumentSection) => {
    setSelectedItem({ type: 'hierarchy', section })
  }

  const handleTimelineSelect = (event: TimelineEvent) => {
    setSelectedItem({ type: 'timeline', event })
  }

  const handleRiskSelect = (risk: Risk) => {
    setSelectedItem({ type: 'risk', risk })
  }

  const handleCommentsClick = (event: TimelineEvent) => {
    setSelectedEventForComments(event)
    setCommentsOpen(true)
  }

  const handleProcessDocument = async () => {
    if (!documentId) return
    try {
      await processMutation.mutateAsync(documentId)
      await refetchDoc()
    } catch (err) {
      console.error('Erro ao processar documento:', err)
    }
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentPage((prev) => Math.max(1, prev - 1))
    } else {
      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
    }
  }

  // Estado de carregamento
  if (docLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{ui.carregandoDocumentos}</p>
        </div>
      </div>
    )
  }

  // Estado de erro
  if (docError || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {ui.erroCarregarDocumento}
          </h2>
          <p className="text-muted-foreground">
            {docError?.message || ui.documentoNaoEncontrado}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-muted/30 overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 shadow-sm z-30 shrink-0">
        {/* Left: Document Info */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/50"
              title="Voltar para upload"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="h-8 w-[1px] bg-border" />
          <div className="p-2 bg-primary/10 text-primary rounded">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground leading-tight truncate max-w-md">
              {documentName}
            </h1>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          </div>

          {document.status === 'PENDING' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleProcessDocument}
              disabled={processMutation.isPending}
              className="gap-2 ml-4"
            >
              {processMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {ui.processando}
                </>
              ) : (
                <>
                  <Play size={16} />
                  {ui.processar}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
            className="h-8 w-8"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{zoomLevel}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
            className="h-8 w-8"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
        </div>

        {/* Right: Pagination */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange('prev')}
            disabled={currentPage <= 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="bg-primary/10 text-primary px-3 py-1 rounded text-sm font-medium">
            {currentPage} / {totalPages}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange('next')}
            disabled={currentPage >= totalPages}
            className="h-8 w-8"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area: PDF Viewer */}
        <main className="flex-1 bg-muted/50 relative overflow-hidden flex flex-col items-center">
          {document.status === 'COMPLETED' ? (
            <PdfViewerWithStates
              url={pdfData?.url}
              isLoading={pdfLoading}
              error={pdfError}
              onRetry={() => refetchPdf()}
              className="h-full w-full"
              currentPage={currentPage}
              onPageChange={handlePdfPageChange}
              onDocumentLoad={handlePdfLoad}
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                {document.status === 'PENDING' ? (
                  <>
                    <p className="font-medium">Documento pendente</p>
                    <p className="text-sm">
                      Processe o documento para visualizar o PDF
                    </p>
                  </>
                ) : document.status === 'PROCESSING' ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="font-medium">Processando documento...</p>
                  </>
                ) : (
                  <p>PDF não disponível</p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar: Analysis Panel */}
        <aside className="w-[480px] bg-card border-l border-border flex flex-col shadow-xl z-20">
          {/* Sidebar Header - Branding */}
          <div className="p-6 pb-2 flex items-center gap-3">
            <div className="w-8 h-8">
              <svg
                viewBox="0 0 100 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M20 10 C 12 10 5 17 5 25 V 95 C 5 103 12 110 20 110 H 80 C 88 110 95 103 95 95 V 35 L 70 10 H 20 Z"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="hsl(var(--card))"
                  strokeLinejoin="round"
                  className="text-foreground"
                />
                <path
                  d="M70 10 V 35 H 95"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  fill="hsl(var(--card))"
                  className="text-foreground"
                />
                <path
                  d="M25 50 H 75"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-foreground"
                />
                <path
                  d="M25 70 H 65"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-foreground"
                />
                <path
                  d="M10 55 C 5 40 25 20 45 25 C 65 30 70 50 60 60 C 50 70 30 70 25 65 C 15 60 15 60 10 55 Z"
                  fill="hsl(var(--primary))"
                  opacity="0.9"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <path
                  d="M60 65 C 75 55 90 65 85 85 C 80 105 60 100 55 90 C 50 80 55 70 60 65 Z"
                  fill="hsl(var(--chart-4))"
                  opacity="0.9"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground leading-none">
                Mult.IA
              </h2>
              <p className="text-xs text-muted-foreground">
                Análise Contratual Inteligente
              </p>
            </div>
          </div>

          {/* Context Card with Risk Button */}
          <div className="px-6 py-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground mb-1 leading-tight truncate">
                  {documentName}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {document.totalPages
                    ? `${document.totalPages} páginas`
                    : 'Processando...'}
                </p>
              </div>

              {/* Risk Alert Button */}
              <button
                onClick={() => setViewMode('risks')}
                className={`
                  shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm
                  ${
                    viewMode === 'risks'
                      ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive/20'
                      : 'bg-card border border-destructive/30 text-destructive hover:bg-destructive/10'
                  }
                `}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {risksLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : criticalRisksCount > 0 ? (
                  `${criticalRisksCount} Riscos`
                ) : (
                  `${risksCount} Riscos`
                )}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-card border border-border shadow-sm text-foreground ring-1 ring-border'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                viewMode === 'hierarchy'
                  ? 'bg-card border border-border shadow-sm text-foreground ring-1 ring-border'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <GitFork className="w-4 h-4" />
              Hierarquia
            </button>
            <button
              onClick={() => setViewMode('chat')}
              className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                viewMode === 'chat'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat IA
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {viewMode === 'timeline' && (
              <>
                {timelineLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : timelineError ? (
                  <div className="p-4 text-center text-destructive">
                    {timelineError.message}
                  </div>
                ) : (
                  <TimelineView
                    events={timeline}
                    selectedId={selectedItem?.event?.id}
                    onSelect={handleTimelineSelect}
                    onCommentsClick={handleCommentsClick}
                  />
                )}
              </>
            )}

            {viewMode === 'hierarchy' && (
              <>
                {structureLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : structureError ? (
                  <div className="p-4 text-center text-destructive">
                    {structureError.message}
                  </div>
                ) : (
                  <HierarchyTree
                    sections={structure}
                    selectedId={selectedItem?.section?.id}
                    onSelect={handleHierarchySelect}
                  />
                )}
              </>
            )}

            {viewMode === 'risks' && documentId && (
              <RiskPanel
                documentId={documentId}
                activeRiskId={selectedItem?.risk?.id}
                onSelectRisk={handleRiskSelect}
              />
            )}

            {viewMode === 'chat' && (
              <div className="h-full min-h-[400px]">
                <ChatPanel documentName={documentName} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Painel de comentários */}
      {selectedEventForComments && documentId && (
        <CommentsPanel
          documentId={documentId}
          eventId={selectedEventForComments.id}
          eventTitle={selectedEventForComments.title}
          isOpen={commentsOpen}
          onClose={() => {
            setCommentsOpen(false)
            setSelectedEventForComments(null)
          }}
        />
      )}

      {/* Overlay para fechar comentários */}
      {commentsOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setCommentsOpen(false)
            setSelectedEventForComments(null)
          }}
        />
      )}
    </div>
  )
}
