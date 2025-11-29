'use client'

import { Plus, Minus, ChevronRight, FolderTree } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { useState, type ReactNode } from 'react'

export interface HierarchyTreeProps {
  className?: string
  children?: ReactNode
}

export function HierarchyTree({ className, children }: HierarchyTreeProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full p-5 bg-card border border-border/60 rounded-xl shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface HierarchyTreeHeaderProps {
  className?: string
  children?: ReactNode
}

export function HierarchyTreeHeader({
  className,
  children,
}: HierarchyTreeHeaderProps) {
  return (
    <div className={cn('mb-5 flex items-center gap-2.5 pb-3 border-b border-border/40', className)}>
      <FolderTree size={18} className="text-primary" />
      <span className="text-sm font-semibold text-foreground tracking-tight">
        {children}
      </span>
    </div>
  )
}

export interface HierarchyTreeContentProps {
  className?: string
  children?: ReactNode
}

export function HierarchyTreeContent({
  className,
  children,
}: HierarchyTreeContentProps) {
  return (
    <div className={cn('overflow-y-auto pr-2 flex-1', className)}>
      <ul className="space-y-1 text-sm">{children}</ul>
    </div>
  )
}

export interface HierarchyTreeItemData {
  id: string
  label: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
}

export interface HierarchyTreeItemProps {
  className?: string
  children?: ReactNode
  id?: string
  label: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
  isActive?: boolean
  isExpandable?: boolean
  defaultExpanded?: boolean
  onSelect?: (item: HierarchyTreeItemData) => void
}

export function HierarchyTreeItem({
  className,
  children,
  id,
  label,
  content,
  notes,
  breadcrumb,
  isActive = false,
  isExpandable = false,
  defaultExpanded = false,
  onSelect,
}: HierarchyTreeItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = Boolean(children)

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setExpanded(!expanded)
    }
  }

  const handleItemClick = () => {
    onSelect?.({
      id: id || label,
      label,
      content,
      notes,
      breadcrumb,
    })
  }

  return (
    <li className={className}>
      <div
        className={cn(
          'flex items-center space-x-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group',
          isActive
            ? 'bg-primary/15 text-primary shadow-sm border border-primary/20'
            : 'hover:bg-muted/50 text-foreground border border-transparent hover:border-border/40',
        )}
        onClick={handleItemClick}
      >
        <span
          onClick={handleExpandClick}
          className="shrink-0 p-1 rounded-md hover:bg-muted-foreground/10 transition-colors duration-200"
        >
          {hasChildren || isExpandable ? (
            expanded ? (
              <Minus size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
            ) : (
              <Plus size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
            )
          ) : (
            <ChevronRight size={14} className="opacity-40" />
          )}
        </span>
        <span className={cn(
          'truncate text-sm font-medium transition-colors duration-200',
          isActive ? 'text-primary' : 'text-foreground'
        )}>{label}</span>
      </div>
      {hasChildren && expanded && (
        <ul className="pl-6 mt-1.5 space-y-1 border-l border-border/30 ml-2">{children}</ul>
      )}
    </li>
  )
}
