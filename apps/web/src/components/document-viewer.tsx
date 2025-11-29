'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  Menu,
  PanelLeftClose,
  Sparkles,
  Loader2,
  AlertCircle,
  Play,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  HierarchyTree,
  HierarchyTreeHeader,
  HierarchyTreeContent,
  HierarchyTreeItem,
  type HierarchyTreeItemData,
} from '@workspace/ui/components/hierarchy-tree'
import {
  Timeline,
  TimelineHeader,
  TimelineContent,
  TimelineItem,
  type TimelineItemData,
} from '@workspace/ui/components/timeline'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { useDocument, useProcessDocument } from '@/lib/hooks/use-documents'
import type { Entity, Deadline, Penalty } from '@/lib/api-client'

interface SelectedItem {
  id: string
  title: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
  type: 'hierarchy' | 'timeline'
}

interface DocumentViewerProps {
  documentId?: string
  documentName?: string
}

export function DocumentViewer({
  documentId,
  documentName: propDocumentName,
}: DocumentViewerProps) {
  const { document, entities, deadlines, timeline, loading, error } =
    useDocument(documentId)
  const { process, processing } = useProcessDocument()
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isAsideVisible, setIsAsideVisible] = useState(true)

  const documentName =
    propDocumentName || document?.filename || 'document_name.pdf'

  const handleHierarchySelect = (item: HierarchyTreeItemData) => {
    setSelectedItem({
      id: item.id,
      title: item.label,
      content: item.content,
      notes: item.notes,
      breadcrumb: item.breadcrumb,
      type: 'hierarchy',
    })
  }

  const handleTimelineSelect = (item: TimelineItemData) => {
    setSelectedItem({
      id: item.id,
      title: item.title,
      content: item.content,
      notes: item.notes,
      breadcrumb: item.breadcrumb || [documentName, item.title],
      type: 'timeline',
    })
  }

  const getItemNotes = (
    itemId: string,
    defaultNotes?: SelectedItem['notes'],
  ) => {
    return defaultNotes || []
  }

  const handleProcessDocument = async () => {
    if (!documentId) return
    try {
      await process(documentId)
      // Refresh will happen automatically via useDocument hook
    } catch (err) {
      console.error('Error processing document:', err)
    }
  }

  // Convert entities to hierarchy tree structure
  const entityHierarchy = useMemo(() => {
    if (!entities || entities.length === 0) {
      return {
        rootEntities: [] as Entity[],
        childMap: new Map<string, Entity[]>(),
      }
    }

    // Group entities by parent
    const rootEntities = entities.filter((e) => !e.parentId)
    const childMap = new Map<string, Entity[]>()
    entities.forEach((e) => {
      if (e.parentId) {
        if (!childMap.has(e.parentId)) {
          childMap.set(e.parentId, [])
        }
        childMap.get(e.parentId)?.push(e)
      }
    })

    return { rootEntities, childMap }
  }, [entities])

  // Render entity hierarchy recursively
  const renderEntityItem = (entity: Entity) => {
    const children = entityHierarchy.childMap.get(entity.id) || []
    const breadcrumb = [documentName, entity.name]

    return (
      <HierarchyTreeItem
        key={entity.id}
        id={entity.id}
        label={entity.name}
        defaultExpanded={children.length > 0}
        content={entity.description || entity.sourceText || ''}
        notes={
          entity.metadata
            ? [
                {
                  author: 'Sistema',
                  date: new Date(entity.createdAt).toLocaleString('pt-BR'),
                  text: `Tipo: ${entity.type} | Prioridade: ${entity.priority}`,
                },
              ]
            : []
        }
        breadcrumb={breadcrumb}
        isActive={selectedItem?.id === entity.id}
        onSelect={handleHierarchySelect}
      >
        {children.map(renderEntityItem)}
      </HierarchyTreeItem>
    )
  }

  // Render deadline hierarchy
  const renderDeadlineItem = (deadline: Deadline) => {
    const hasRules = deadline.rules.length > 0
    const hasPenalties = deadline.penalties && deadline.penalties.length > 0

    return (
      <HierarchyTreeItem
        key={deadline.id}
        id={deadline.id}
        label={deadline.title}
        defaultExpanded={hasRules || hasPenalties}
        content={`${deadline.description}\n\nPrazo: ${new Date(deadline.dueDate).toLocaleDateString('pt-BR')}\nPrioridade: ${deadline.priority}`}
        notes={[
          {
            author: 'Sistema',
            date: new Date(deadline.createdAt).toLocaleString('pt-BR'),
            text: `Status: ${deadline.status}`,
          },
        ]}
        breadcrumb={[documentName, deadline.title]}
        isActive={selectedItem?.id === deadline.id}
        onSelect={handleHierarchySelect}
      >
        {hasRules && (
          <HierarchyTreeItem
            id={`rules-${deadline.id}`}
            label="Regras"
            content={`Total de ${deadline.rules.length} regras`}
            breadcrumb={[documentName, deadline.title, 'Regras']}
            isActive={selectedItem?.id === `rules-${deadline.id}`}
            onSelect={handleHierarchySelect}
          >
            {deadline.rules.map((rule: string, index: number) => (
              <HierarchyTreeItem
                key={`rule-${deadline.id}-${index}`}
                id={`rule-${deadline.id}-${index}`}
                label={`Regra ${index + 1}`}
                content={rule}
                breadcrumb={[
                  documentName,
                  deadline.title,
                  'Regras',
                  `Regra ${index + 1}`,
                ]}
                isActive={selectedItem?.id === `rule-${deadline.id}-${index}`}
                onSelect={handleHierarchySelect}
              />
            ))}
          </HierarchyTreeItem>
        )}
        {hasPenalties && (
          <HierarchyTreeItem
            id={`penalties-${deadline.id}`}
            label="Multas"
            content={`Total de ${deadline.penalties?.length || 0} multas`}
            breadcrumb={[documentName, deadline.title, 'Multas']}
            isActive={selectedItem?.id === `penalties-${deadline.id}`}
            onSelect={handleHierarchySelect}
          >
            {deadline.penalties?.map((penalty: Penalty) => (
              <HierarchyTreeItem
                key={penalty.id}
                id={penalty.id}
                label={`Multa: ${penalty.description}`}
                content={`Tipo: ${penalty.type} | Valor: ${penalty.value} ${penalty.currency || 'BRL'}`}
                breadcrumb={[
                  documentName,
                  deadline.title,
                  'Multas',
                  penalty.description,
                ]}
                isActive={selectedItem?.id === penalty.id}
                onSelect={handleHierarchySelect}
              />
            ))}
          </HierarchyTreeItem>
        )}
      </HierarchyTreeItem>
    )
  }

  // Convert timeline events to timeline items
  const timelineItems = useMemo(() => {
    if (!timeline || timeline.length === 0) return []

    return timeline.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time || undefined,
      content: event.metadata
        ? JSON.stringify(event.metadata, null, 2)
        : event.description,
      notes: [],
      breadcrumb: [documentName, event.title],
    }))
  }, [timeline, documentName])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando documento...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Erro ao carregar documento
          </h2>
          <p className="text-muted-foreground">
            {error || 'Documento não encontrado'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* AppBar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-muted/50 transition-all duration-200"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold truncate max-w-md">
              {documentName}
            </h1>
            {document.status === 'pending' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleProcessDocument}
                disabled={processing}
                className="gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Processar Documento
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAsideVisible(!isAsideVisible)}
            className="gap-2 hover:bg-muted/50 transition-all duration-200"
            title={
              isAsideVisible
                ? 'Ocultar painel lateral'
                : 'Exibir painel lateral'
            }
          >
            {isAsideVisible ? (
              <>
                <PanelLeftClose size={16} />
                <span className="hidden sm:inline">Ocultar Painel</span>
              </>
            ) : (
              <>
                <Menu size={16} />
                <span className="hidden sm:inline">Exibir Painel</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex h-screen w-full px-5 py-2 gap-5 bg-background/95">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
          {/* Left Section: Timeline + DetailPanel (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col lg:flex-row gap-5">
            <aside
              className={`flex flex-col w-full lg:w-80 shrink-0 gap-5 transition-all duration-300 ease-in-out ${
                isAsideVisible
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-full opacity-0 absolute pointer-events-none'
              }`}
            >
              {/* Timeline */}
              <Timeline className="h-full w-full">
                <TimelineHeader>Timeline</TimelineHeader>
                <TimelineContent>
                  {timelineItems.length > 0 ? (
                    timelineItems.map((item) => (
                      <TimelineItem
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        description={item.description}
                        date={item.date}
                        time={item.time}
                        content={item.content}
                        notes={item.notes}
                        breadcrumb={item.breadcrumb}
                        isActive={selectedItem?.id === item.id}
                        onSelect={handleTimelineSelect}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum evento na timeline ainda
                    </div>
                  )}
                </TimelineContent>
              </Timeline>
            </aside>

            {/* Main Content - Detail Panel (Maximized) */}
            <Card className={`flex-1 transition-all duration-300 ease-in-out`}>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Conteúdo
                </CardTitle>
              </CardHeader>
              {selectedItem ? (
                <CardContent>
                  <p>
                    {selectedItem.content ||
                      'Sem conteúdo disponível para este item.'}
                  </p>
                </CardContent>
              ) : (
                <CardContent className="flex flex-col items-center justify-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <div className="flex flex-col gap-2">
                    <p>Que tal começar explorando o documento?</p>
                    <p>
                      Selecione um item na timeline ou hierarquia para ver os
                      detalhes.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Section: HierarchyTree + Comments (1/3 width) */}
          <div className="flex flex-col gap-5">
            <HierarchyTree className="flex-1">
              <HierarchyTreeHeader>Hierarquia</HierarchyTreeHeader>
              <HierarchyTreeContent>
                {entityHierarchy.rootEntities.length > 0 ||
                (deadlines && deadlines.length > 0) ? (
                  <>
                    {entityHierarchy.rootEntities.map(renderEntityItem)}
                    {deadlines?.map(renderDeadlineItem)}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum item na hierarquia ainda
                    {document.status === 'pending' && (
                      <p className="text-sm mt-2">
                        Processe o documento para ver a hierarquia
                      </p>
                    )}
                  </div>
                )}
              </HierarchyTreeContent>
            </HierarchyTree>

            {/* Comments Section - Below HierarchyTree */}
            {selectedItem && (
              <Card className="flex flex-col gap-3">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageCircle size={16} className="text-primary" />
                    Comentários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {getItemNotes(selectedItem.id, selectedItem.notes).map(
                      (note, index) => (
                        <p key={`${selectedItem.id}-note-${index}`}>
                          {note.text}
                        </p>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
