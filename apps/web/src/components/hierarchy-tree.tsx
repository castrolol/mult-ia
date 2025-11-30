'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import type { DocumentSection } from '@/lib/api-client'
import { sectionLevels, ui } from '@/lib/i18n'

interface HierarchyTreeProps {
  sections: DocumentSection[]
  selectedId?: string
  onSelect?: (section: DocumentSection) => void
  className?: string
}

export function HierarchyTree({
  sections,
  selectedId,
  onSelect,
  className,
}: HierarchyTreeProps) {
  if (sections.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{ui.nenhumItemHierarquia}</p>
        <p className="text-sm mt-1">{ui.processeParaHierarquia}</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto', className)}>
      {sections.map((section) => (
        <HierarchyNode
          key={section.id}
          section={section}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
        />
      ))}
    </div>
  )
}

interface HierarchyNodeProps {
  section: DocumentSection
  selectedId?: string
  onSelect?: (section: DocumentSection) => void
  level: number
}

function HierarchyNode({
  section,
  selectedId,
  onSelect,
  level,
}: HierarchyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = section.children && section.children.length > 0
  const isSelected = selectedId === section.id

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleSelect = () => {
    onSelect?.(section)
  }

  // Traduzir o nível hierárquico
  const levelLabel = sectionLevels[section.level] || section.level

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors rounded-sm',
          isSelected && 'bg-primary/10 text-primary',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {section.number && (
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {section.number}
              </span>
            )}
            <span className="text-sm font-medium truncate">{section.title}</span>
          </div>
          {section.summary && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {section.summary}
            </p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {levelLabel}
        </span>
      </div>

      {/* Filhos */}
      {hasChildren && isExpanded && (
        <div>
          {section.children!.map((child) => (
            <HierarchyNode
              key={child.id}
              section={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Componente de detalhes da seção selecionada
 */
interface SectionDetailProps {
  section: DocumentSection | null
  breadcrumb?: Array<{ id: string; title: string }>
  className?: string
}

export function SectionDetail({
  section,
  breadcrumb,
  className,
}: SectionDetailProps) {
  if (!section) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <p>{ui.selecioneItem}</p>
      </div>
    )
  }

  const levelLabel = sectionLevels[section.level] || section.level

  return (
    <div className={cn('p-4', className)}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 overflow-x-auto">
          {breadcrumb.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1 shrink-0">
              {index > 0 && <span>/</span>}
              <span className={index === breadcrumb.length - 1 ? 'text-foreground' : ''}>
                {item.title}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            {levelLabel}
          </span>
          {section.number && (
            <span className="text-sm font-mono text-muted-foreground">
              {section.number}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold">{section.title}</h3>
      </div>

      {/* Resumo */}
      {section.summary && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Resumo
          </h4>
          <p className="text-sm">{section.summary}</p>
        </div>
      )}

      {/* Páginas de origem */}
      {section.sourcePages && section.sourcePages.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Páginas: {section.sourcePages.join(', ')}
        </div>
      )}
    </div>
  )
}

