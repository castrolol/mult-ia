'use client'

import { FileText } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export interface PDFViewerProps {
  className?: string
  children?: ReactNode
  documentUrl?: string
  documentName?: string
}

export function PDFViewer({
  className,
  children,
  documentUrl,
  documentName,
}: PDFViewerProps) {
  return (
    <div
      className={cn(
        'flex-1 p-5 bg-card border border-border/60 rounded-xl shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {documentUrl ? (
        <iframe
          src={documentUrl}
          className="w-full h-full rounded-lg shadow-inner"
          title={documentName || 'PDF Document'}
        />
      ) : children ? (
        children
      ) : (
        <PDFViewerEmptyState />
      )}
    </div>
  )
}

export function PDFViewerEmptyState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border/40">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <FileText size={40} className="text-primary" />
        </div>
        <p className="font-bold text-lg text-foreground mb-2 tracking-tight">PDF View</p>
        <p className="text-sm text-muted-foreground leading-relaxed">O conteúdo do documento será exibido aqui.</p>
      </div>
    </div>
  )
}
