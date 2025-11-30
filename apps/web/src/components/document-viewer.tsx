'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  Play,
  List,
  Calendar,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  useDocument,
  useDocumentPdfUrl,
  useProcessDocument,
  useTimeline,
  useStructure,
} from '@/lib/hooks'
import type { DocumentSection, TimelineEvent } from '@/lib/api-client'
import { documentStatus, ui } from '@/lib/i18n'
import { HierarchyTree, SectionDetail } from './hierarchy-tree'
import { TimelineView, EventDetail } from './timeline-view'
import { CommentsPanel } from './comments-panel'

// Dynamic import para evitar SSR do PDF.js (usa DOMMatrix que não existe no servidor)
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

type SelectedItemType = 'hierarchy' | 'timeline'

interface SelectedItem {
  type: SelectedItemType
  section?: DocumentSection
  event?: TimelineEvent
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
  
  // Buscar URL do PDF apenas quando documento estiver completo
  const shouldFetchPdf = documentId && document?.status === 'COMPLETED'
  const {
    data: pdfData,
    isLoading: pdfLoading,
    error: pdfError,
    refetch: refetchPdf,
  } = useDocumentPdfUrl(shouldFetchPdf ? documentId : undefined)

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [activeTab, setActiveTab] = useState<'hierarquia' | 'timeline'>(
    'hierarquia',
  )
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [selectedEventForComments, setSelectedEventForComments] =
    useState<TimelineEvent | null>(null)

  const documentName =
    propDocumentName || document?.filename || 'documento.pdf'
  const statusLabel = document?.status
    ? documentStatus[document.status]
    : ''

  const timeline = timelineData?.allEvents || []
  const structure = structureData?.tree || []

  const handleHierarchySelect = (section: DocumentSection) => {
    setSelectedItem({ type: 'hierarchy', section })
  }

  const handleTimelineSelect = (event: TimelineEvent) => {
    setSelectedItem({ type: 'timeline', event })
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
    <div className="flex flex-col h-screen">
      {/* AppBar */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-muted/50 transition-all duration-200"
              >
                <ArrowLeft size={16} />
                {ui.voltar}
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h1 className="text-lg font-semibold truncate max-w-md">
                {documentName}
              </h1>
            </div>
            <span className="text-xs bg-muted px-2 py-1 rounded">
              {statusLabel}
            </span>
          </div>

          {document.status === 'PENDING' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleProcessDocument}
              disabled={processMutation.isPending}
              className="gap-2"
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
      </header>

      {/* Conteúdo principal */}
      <div className="flex-1 flex overflow-hidden bg-muted/30">
        {/* Sidebar esquerda - Abas Hierarquia/Timeline */}
        <aside className="w-80 flex flex-col bg-background shadow-sm">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'hierarquia' | 'timeline')}
            className="flex flex-col h-full"
          >
            <div className="p-3 pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hierarquia" className="gap-1.5">
                  <List size={14} />
                  {ui.hierarquia}
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5">
                  <Calendar size={14} />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hierarquia" className="flex-1 overflow-auto m-0 mt-2">
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
            </TabsContent>

            <TabsContent value="timeline" className="flex-1 overflow-auto m-0 mt-2">
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
            </TabsContent>
          </Tabs>
        </aside>

        {/* Área central - PDF Viewer com margens */}
        <main className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex-1 rounded-xl overflow-hidden bg-background shadow-lg border">
            {document.status === 'COMPLETED' ? (
              <PdfViewerWithStates
                url={pdfData?.url}
                isLoading={pdfLoading}
                error={pdfError}
                onRetry={() => refetchPdf()}
                className="h-full"
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
          </div>
        </main>

        {/* Sidebar direita - Detalhes */}
        <aside className="w-96 flex flex-col bg-background shadow-sm">
          <Card className="flex-1 border-0 rounded-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                {ui.conteudo}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {selectedItem?.type === 'hierarchy' && selectedItem.section ? (
                <SectionDetail section={selectedItem.section} />
              ) : selectedItem?.type === 'timeline' && selectedItem.event ? (
                <EventDetail event={selectedItem.event} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">{ui.quetalComecar}</p>
                  <p className="text-sm mt-1">{ui.selecioneItem}</p>
                </div>
              )}
            </CardContent>
          </Card>
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
