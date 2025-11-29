'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export interface TimelineProps {
  className?: string
  children?: ReactNode
}

export function Timeline({ className, children }: TimelineProps) {
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

export interface TimelineHeaderProps {
  className?: string
  children?: ReactNode
}

export function TimelineHeader({ className, children }: TimelineHeaderProps) {
  return (
    <div
      className={cn(
        'mb-5 flex items-center gap-2.5 pb-3 border-b border-border/40',
        className,
      )}
    >
      <Calendar size={18} className="text-primary" />
      <span className="text-sm font-semibold text-foreground tracking-tight">
        {children}
      </span>
    </div>
  )
}

export interface TimelineContentProps {
  className?: string
  children?: ReactNode
}

export function TimelineContent({ className, children }: TimelineContentProps) {
  return (
    <div className={cn('overflow-y-auto flex-1', className)}>
      <div className="relative">{children}</div>
    </div>
  )
}

export interface TimelineItemData {
  id: string
  title: string
  description?: string
  date?: string
  time?: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
}

export interface TimelineItemProps {
  className?: string
  children?: ReactNode
  id?: string
  title: string
  description?: string
  date?: string
  time?: string
  content?: string
  notes?: Array<{ author?: string; date?: string; text: string }>
  breadcrumb?: string[]
  isActive?: boolean
  onSelect?: (item: TimelineItemData) => void
}

export function TimelineItem({
  className,
  id,
  title,
  description,
  date,
  time,
  content,
  notes,
  breadcrumb,
  isActive = false,
  onSelect,
}: TimelineItemProps) {
  const handleClick = () => {
    onSelect?.({
      id: id || title,
      title,
      description,
      date,
      time,
      content,
      notes,
      breadcrumb,
    })
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 pb-6 last:pb-0 cursor-pointer group transition-all duration-200 rounded-lg px-2 -mx-2 hover:bg-muted/30',
        className,
      )}
      onClick={handleClick}
    >
      {/* Linha vertical conectora */}
      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border/50 last:hidden" />

      {/* Ícone do calendário */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-sm',
          isActive
            ? 'bg-primary/15 border-primary text-primary shadow-primary/20'
            : 'bg-card border-border/60 text-muted-foreground group-hover:border-primary/60 group-hover:text-primary group-hover:bg-primary/5 group-hover:shadow-md',
        )}
      >
        <Calendar size={18} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p
            className={cn(
              'text-sm font-semibold truncate transition-colors duration-200',
              isActive
                ? 'text-primary'
                : 'text-foreground group-hover:text-primary',
            )}
          >
            {title}
          </p>
          {(date || time) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 font-medium">
              {date && <span>{date}</span>}
              {date && time && <span className="opacity-50">•</span>}
              {time && <span>{time}</span>}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
