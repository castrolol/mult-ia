'use client'

import { Send } from 'lucide-react'
import { useState, type ReactNode, type FormEvent } from 'react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

export interface DetailPanelProps {
  className?: string
  children?: ReactNode
}

export function DetailPanel({ className, children }: DetailPanelProps) {
  return (
    <div
      className={cn(
        'flex-1 p-6 bg-card border border-border/60 rounded-xl shadow-sm backdrop-blur-sm flex flex-col',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface DetailPanelHeaderProps {
  className?: string
  title: string
  breadcrumb?: string[]
}

export function DetailPanelHeader({
  className,
  title,
  breadcrumb,
}: DetailPanelHeaderProps) {
  return (
    <div className={cn('mb-6 pb-5 border-b border-border/60', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2.5 font-medium tracking-wide">
          {breadcrumb.join(' → ')}
        </p>
      )}
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
    </div>
  )
}

export interface DetailPanelContentProps {
  className?: string
  children?: ReactNode
}

export function DetailPanelContent({
  className,
  children,
}: DetailPanelContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none flex-1 text-foreground/80 leading-relaxed',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface DetailPanelNoteProps {
  className?: string
  children?: ReactNode
  author?: string
  date?: string
}

export function DetailPanelNote({
  className,
  children,
  author,
  date,
}: DetailPanelNoteProps) {
  return (
    <div
      className={cn(
        'mt-4 p-4 bg-muted/40 border border-border/60 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted/50',
        className,
      )}
    >
      {(author || date) && (
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border/40">
          {author && (
            <span className="text-xs font-semibold text-foreground">
              {author}
            </span>
          )}
          {date && (
            <span className="text-xs text-muted-foreground font-medium">{date}</span>
          )}
        </div>
      )}
      <p className="text-sm text-foreground/70 leading-relaxed">{children}</p>
    </div>
  )
}

export interface DetailPanelCommentInputProps {
  className?: string
  placeholder?: string
  onSubmit?: (comment: string) => void
}

export function DetailPanelCommentInput({
  className,
  placeholder = 'Adicionar Info / Comentário',
  onSubmit,
}: DetailPanelCommentInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit?.(value.trim())
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('mt-6', className)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full pl-4 pr-12 py-3 bg-background border border-input/60 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm placeholder:text-muted-foreground shadow-sm hover:border-border"
          placeholder={placeholder}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0 h-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-l-none"
        >
          <Send size={18} />
        </Button>
      </div>
    </form>
  )
}

export interface DetailPanelEmptyStateProps {
  className?: string
  title?: string
  description?: string
}

export function DetailPanelEmptyState({
  className,
  title = 'Selecione um item',
  description = 'Clique em um item da hierarquia ou timeline para ver os detalhes.',
}: DetailPanelEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center text-center p-12',
        className,
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center mb-6 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2.5 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
    </div>
  )
}
