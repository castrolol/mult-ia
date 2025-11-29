'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  Menu,
  PanelLeftClose,
  Sparkles,
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
import { PDFViewerEmptyState } from '@workspace/ui/components/pdf-viewer'

interface SelectedItem {
  id: string
  title: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
  type: 'hierarchy' | 'timeline'
}

interface DocumentViewerProps {
  documentName?: string
}

export function DocumentViewer({
  documentName = 'document_name.pdf',
}: DocumentViewerProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isAsideVisible, setIsAsideVisible] = useState(true)
  const [comments, setComments] = useState<
    Record<string, Array<{ author: string; date: string; text: string }>>
  >({})

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

  const handleAddComment = (comment: string) => {
    if (!selectedItem) return

    const newComment = {
      author: 'Você',
      date: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      text: comment,
    }

    setComments((prev) => ({
      ...prev,
      [selectedItem.id]: [...(prev[selectedItem.id] || []), newComment],
    }))
  }

  const getItemNotes = (
    itemId: string,
    defaultNotes?: SelectedItem['notes'],
  ) => {
    const savedComments = comments[itemId] || []
    return [...(defaultNotes || []), ...savedComments]
  }

  // Dados de exemplo para a hierarquia
  const hierarchyData = {
    prazoX: {
      id: 'prazo-x',
      content:
        'O Prazo X refere-se ao período estabelecido para entrega dos documentos iniciais do processo. Este prazo é improrrogável e deve ser cumprido rigorosamente conforme estabelecido no edital.',
      notes: [
        {
          author: 'Sistema',
          date: '29/11/2025 14:30',
          text: 'Prazo identificado automaticamente no documento.',
        },
      ],
      breadcrumb: [documentName, 'Prazo X'],
    },
    regras: {
      id: 'regras',
      content:
        'As regras definem os critérios e procedimentos que devem ser seguidos durante todo o processo. O não cumprimento das regras pode resultar em penalidades conforme descrito na seção de multas.',
      notes: [],
      breadcrumb: [documentName, 'Prazo Y', 'Regras'],
    },
    multaX: {
      id: 'multa-x',
      content:
        'A Multa X corresponde a 2% do valor total do contrato, aplicável em caso de descumprimento do prazo estabelecido. O valor será deduzido automaticamente do pagamento subsequente.',
      notes: [
        {
          author: 'João Silva',
          date: '29/11/2025 10:15',
          text: 'O fulano já solicitou com a TI para gerar os documentos necessários, falar com XXXXXX',
        },
      ],
      breadcrumb: [documentName, 'Prazo Y', 'Regras', 'Multa X'],
    },
  }

  // Dados de exemplo para a timeline
  const timelineData = {
    enviado: {
      id: 'doc-enviado',
      content:
        'O documento foi recebido pelo sistema e está aguardando processamento. Todos os metadados foram extraídos com sucesso e o arquivo está íntegro.',
      notes: [],
      breadcrumb: [documentName, 'Documento Enviado'],
    },
    processamento: {
      id: 'processamento',
      content:
        'O sistema está analisando o conteúdo do documento utilizando inteligência artificial para identificar cláusulas, prazos e obrigações relevantes.',
      notes: [],
      breadcrumb: [documentName, 'Processamento'],
    },
    analise: {
      id: 'analise-concluida',
      content:
        'A análise do documento foi concluída com sucesso. Foram identificados 3 prazos, 5 regras e 2 multas potenciais. Revise os itens na hierarquia ao lado.',
      notes: [
        {
          author: 'Sistema IA',
          date: '29/11/2025 14:35',
          text: 'Análise automática concluída. Confiança: 94%',
        },
      ],
      breadcrumb: [documentName, 'Análise Concluída'],
    },
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
                  <TimelineItem
                    id="doc-enviado"
                    title="Documento Enviado"
                    description="Upload do documento realizado com sucesso."
                    date="29/11/2025"
                    time="14:30"
                    content={timelineData.enviado.content}
                    breadcrumb={timelineData.enviado.breadcrumb}
                    isActive={selectedItem?.id === 'doc-enviado'}
                    onSelect={handleTimelineSelect}
                  />
                  <TimelineItem
                    id="processamento"
                    title="Processamento"
                    description="Documento em análise pelo sistema."
                    date="29/11/2025"
                    time="14:32"
                    content={timelineData.processamento.content}
                    breadcrumb={timelineData.processamento.breadcrumb}
                    isActive={selectedItem?.id === 'processamento'}
                    onSelect={handleTimelineSelect}
                  />
                  <TimelineItem
                    id="analise-concluida"
                    title="Análise Concluída"
                    description="Extração de dados finalizada."
                    date="29/11/2025"
                    time="14:35"
                    content={timelineData.analise.content}
                    notes={timelineData.analise.notes}
                    breadcrumb={timelineData.analise.breadcrumb}
                    isActive={selectedItem?.id === 'analise-concluida'}
                    onSelect={handleTimelineSelect}
                  />
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
                <HierarchyTreeItem
                  id="prazo-x"
                  label="Prazo X"
                  defaultExpanded
                  content={hierarchyData.prazoX.content}
                  notes={hierarchyData.prazoX.notes}
                  breadcrumb={hierarchyData.prazoX.breadcrumb}
                  isActive={selectedItem?.id === 'prazo-x'}
                  onSelect={handleHierarchySelect}
                >
                  <HierarchyTreeItem
                    id="prazo-x-regras"
                    label="Regras"
                    content={hierarchyData.regras.content}
                    breadcrumb={[documentName, 'Prazo X', 'Regras']}
                    isActive={selectedItem?.id === 'prazo-x-regras'}
                    onSelect={handleHierarchySelect}
                  />
                </HierarchyTreeItem>
                <HierarchyTreeItem
                  id="prazo-y"
                  label="Prazo Y"
                  defaultExpanded
                  content="O Prazo Y estabelece o período para a segunda fase do processo."
                  breadcrumb={[documentName, 'Prazo Y']}
                  isActive={selectedItem?.id === 'prazo-y'}
                  onSelect={handleHierarchySelect}
                >
                  <HierarchyTreeItem
                    id="regras"
                    label="Regras"
                    defaultExpanded
                    content={hierarchyData.regras.content}
                    notes={hierarchyData.regras.notes}
                    breadcrumb={hierarchyData.regras.breadcrumb}
                    isActive={selectedItem?.id === 'regras'}
                    onSelect={handleHierarchySelect}
                  >
                    <HierarchyTreeItem
                      id="multa-x"
                      label="Multa X"
                      content={hierarchyData.multaX.content}
                      notes={hierarchyData.multaX.notes}
                      breadcrumb={hierarchyData.multaX.breadcrumb}
                      isActive={selectedItem?.id === 'multa-x'}
                      onSelect={handleHierarchySelect}
                    />
                  </HierarchyTreeItem>
                </HierarchyTreeItem>
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
