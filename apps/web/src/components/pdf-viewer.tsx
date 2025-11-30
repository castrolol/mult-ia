'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, Maximize2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import {
  highlightPlugin,
  MessageIcon,
  RenderHighlightContentProps,
  RenderHighlightTargetProps,
  RenderHighlightsProps,
} from '@react-pdf-viewer/highlight'

// Estilos necessários
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'
import '@react-pdf-viewer/page-navigation/lib/styles/index.css'

import { ui } from '@/lib/i18n'

// Versão do PDF.js Worker (deve coincidir com a versão instalada)
const PDFJS_VERSION = '3.11.174'
const WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`

// Tipo para highlights
export interface PdfHighlightData {
  id: string
  content: string
  highlightAreas: Array<{
    pageIndex: number
    left: number
    top: number
    width: number
    height: number
  }>
  quote?: string
  entityId?: string
  entityType?: string
}

interface PdfViewerProps {
  /** URL do PDF para renderizar */
  url: string
  /** Highlights para exibir no PDF */
  highlights?: PdfHighlightData[]
  /** Classes CSS adicionais */
  className?: string
  /** Página atual (1-indexed) */
  currentPage?: number
  /** Callback quando a página muda */
  onPageChange?: (page: number) => void
  /** Callback quando o total de páginas é determinado */
  onDocumentLoad?: (totalPages: number) => void
  /** Callback quando um highlight é clicado */
  onHighlightClick?: (highlight: PdfHighlightData) => void
  /** Callback quando uma nova área é selecionada */
  onSelectionFinished?: (selection: {
    selectedText: string
    highlightAreas: PdfHighlightData['highlightAreas']
  }) => void
}

/**
 * Componente para visualização de PDF com suporte a highlights
 * Usa @react-pdf-viewer para renderização robusta
 */
export function PdfViewer({
  url,
  highlights = [],
  className = '',
  currentPage = 1,
  onPageChange,
  onDocumentLoad,
  onHighlightClick,
  onSelectionFinished,
}: PdfViewerProps) {
  const [isReady, setIsReady] = useState(false)
  const hasJumpedRef = useRef(false)

  // Plugin de navegação de páginas
  const pageNavigationPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavigationPluginInstance

  // Ir para a página quando currentPage muda
  useEffect(() => {
    if (isReady && currentPage > 0) {
      // A API usa 0-indexed, mas currentPage é 1-indexed
      jumpToPage(currentPage - 1)
    }
  }, [currentPage, isReady, jumpToPage])

  const handleOpenInNewTab = () => {
    window.open(url, '_blank')
  }

  // Renderizar área de highlight existente
  const renderHighlights = (props: RenderHighlightsProps) => (
    <div>
      {highlights
        .filter((highlight) =>
          highlight.highlightAreas.some(
            (area) => area.pageIndex === props.pageIndex
          )
        )
        .map((highlight) => (
          <div key={highlight.id}>
            {highlight.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => (
                <div
                  key={idx}
                  className="absolute bg-yellow-300/40 cursor-pointer hover:bg-yellow-400/50 transition-colors"
                  style={{
                    left: `${area.left}%`,
                    top: `${area.top}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`,
                  }}
                  onClick={() => onHighlightClick?.(highlight)}
                  title={highlight.content}
                />
              ))}
          </div>
        ))}
    </div>
  )

  // Renderizar popup quando texto é selecionado
  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      className="absolute z-10 bg-background border rounded-lg shadow-lg p-2"
      style={{
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          if (onSelectionFinished) {
            onSelectionFinished({
              selectedText: props.selectedText,
              highlightAreas: props.highlightAreas.map((area) => ({
                pageIndex: area.pageIndex,
                left: area.left,
                top: area.top,
                width: area.width,
                height: area.height,
              })),
            })
          }
          props.cancel()
        }}
      >
        <MessageIcon /> Adicionar nota
      </Button>
    </div>
  )

  // Renderizar conteúdo do highlight (tooltip) - retorna fragmento vazio
  const renderHighlightContent = (_props: RenderHighlightContentProps) => <></>

  // Plugin de highlight
  const highlightPluginInstance = highlightPlugin({
    renderHighlights,
    renderHighlightTarget: onSelectionFinished ? renderHighlightTarget : undefined,
    renderHighlightContent,
  })

  // Plugin de layout padrão (toolbar, sidebar, etc)
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [], // Remove sidebar para layout mais limpo
    toolbarPlugin: {
      fullScreenPlugin: {
        onEnterFullScreen: () => {},
        onExitFullScreen: () => {},
      },
    },
  })

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Botão para abrir em nova aba */}
      <div className="absolute top-2 right-2 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenInNewTab}
          title="Abrir em nova aba"
          className="gap-2 shadow-md"
        >
          <Maximize2 size={16} />
        </Button>
      </div>

      {/* Visualizador do PDF */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Worker workerUrl={WORKER_URL}>
          <Viewer
            fileUrl={url}
            plugins={[defaultLayoutPluginInstance, highlightPluginInstance, pageNavigationPluginInstance]}
            defaultScale={SpecialZoomLevel.PageWidth}
            initialPage={currentPage - 1}
            onDocumentLoad={(e) => {
              setIsReady(true)
              onDocumentLoad?.(e.doc.numPages)
            }}
            onPageChange={(e) => {
              // e.currentPage é 0-indexed
              onPageChange?.(e.currentPage + 1)
            }}
            renderLoader={(percentages: number) => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    {ui.carregandoPdf} ({Math.round(percentages)}%)
                  </p>
                </div>
              </div>
            )}
            renderError={(error) => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {ui.erroCarregarPdf}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {error.message || 'Erro desconhecido'}
                  </p>
                  <Button onClick={handleOpenInNewTab} variant="secondary">
                    Abrir em nova aba
                  </Button>
                </div>
              </div>
            )}
          />
        </Worker>
      </div>
    </div>
  )
}

/**
 * Wrapper com estados de loading/error externo
 */
interface PdfViewerWithStatesProps {
  url: string | null | undefined
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  highlights?: PdfHighlightData[]
  className?: string
  currentPage?: number
  onPageChange?: (page: number) => void
  onDocumentLoad?: (totalPages: number) => void
  onHighlightClick?: (highlight: PdfHighlightData) => void
  onSelectionFinished?: (selection: {
    selectedText: string
    highlightAreas: PdfHighlightData['highlightAreas']
  }) => void
}

export function PdfViewerWithStates({
  url,
  isLoading = false,
  error,
  onRetry,
  highlights = [],
  className = '',
  currentPage,
  onPageChange,
  onDocumentLoad,
  onHighlightClick,
  onSelectionFinished,
}: PdfViewerWithStatesProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{ui.carregandoPdf}</p>
        </div>
      </div>
    )
  }

  if (error || !url) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{ui.erroCarregarPdf}</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'URL do PDF não disponível'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <PdfViewer
      url={url}
      highlights={highlights}
      className={className}
      currentPage={currentPage}
      onPageChange={onPageChange}
      onDocumentLoad={onDocumentLoad}
      onHighlightClick={onHighlightClick}
      onSelectionFinished={onSelectionFinished}
    />
  )
}
