'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
  DetailPanel,
  DetailPanelHeader,
  DetailPanelContent,
  DetailPanelNote,
  DetailPanelCommentInput,
  DetailPanelEmptyState,
} from '@workspace/ui/components/detail-panel'

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
    <div className="flex h-screen w-full p-5 gap-5 bg-background/95">
      {/* Sidebar */}
      <aside className="flex flex-col w-full max-w-sm shrink-0 gap-5">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="w-fit gap-2 hover:bg-muted/50 transition-all duration-200">
            <ArrowLeft size={16} />
            Voltar
          </Button>
        </Link>

        {/* Hierarchy */}
        <HierarchyTree className="h-1/2">
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

        {/* Timeline */}
        <Timeline className="h-1/2">
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

      {/* Main Content - Detail Panel */}
      <DetailPanel>
        {selectedItem ? (
          <>
            <DetailPanelHeader
              title={selectedItem.title}
              breadcrumb={selectedItem.breadcrumb}
            />
            <DetailPanelContent>
              <p>
                {selectedItem.content ||
                  'Sem conteúdo disponível para este item.'}
              </p>
            </DetailPanelContent>

            {/* Notes/Comments */}
            {getItemNotes(selectedItem.id, selectedItem.notes).map(
              (note, index) => (
                <DetailPanelNote
                  key={`${selectedItem.id}-note-${index}`}
                  author={note.author}
                  date={note.date}
                >
                  {note.text}
                </DetailPanelNote>
              ),
            )}

            <DetailPanelCommentInput onSubmit={handleAddComment} />
          </>
        ) : (
          <DetailPanelEmptyState />
        )}
      </DetailPanel>
    </div>
  )
}
