'use client'

import { ZoomIn, ZoomOut, Download, MoreHorizontal } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export interface DocumentHeaderProps {
  className?: string
  children?: ReactNode
}

export function DocumentHeader({ className, children }: DocumentHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between p-4 bg-card border border-border/60 rounded-xl shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </header>
  )
}

export interface DocumentHeaderTitleProps {
  className?: string
  children?: ReactNode
}

export function DocumentHeaderTitle({
  className,
  children,
}: DocumentHeaderTitleProps) {
  return (
    <h1
      className={cn(
        'text-lg font-bold text-foreground truncate max-w-md tracking-tight',
        className,
      )}
    >
      {children}
    </h1>
  )
}

export interface DocumentHeaderActionsProps {
  className?: string
  onZoomIn?: () => void
  onZoomOut?: () => void
  onDownload?: () => void
}

export function DocumentHeaderActions({
  className,
  onZoomIn,
  onZoomOut,
  onDownload,
}: DocumentHeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
      >
        <ZoomIn size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
      >
        <ZoomOut size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDownload}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
      >
        <Download size={20} />
      </Button>
    </div>
  )
}
