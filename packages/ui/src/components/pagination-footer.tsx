'use client'

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

export interface PaginationFooterProps {
  className?: string
  currentPage: number
  totalPages: number
  onFirstPage?: () => void
  onPreviousPage?: () => void
  onNextPage?: () => void
  onLastPage?: () => void
}

export function PaginationFooter({
  className,
  currentPage,
  totalPages,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
}: PaginationFooterProps) {
  return (
    <footer
      className={cn(
        'flex h-16 items-center justify-center p-4 bg-card border border-border/60 rounded-xl shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={onFirstPage}
          disabled={currentPage <= 1}
          className="hover:text-foreground hover:bg-muted/50 transition-all duration-200"
        >
          <ChevronsLeft size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="hover:text-foreground hover:bg-muted/50 transition-all duration-200"
        >
          <ChevronLeft size={20} />
        </Button>
        <span className="text-sm font-semibold text-foreground px-3 tracking-tight">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="hover:text-foreground hover:bg-muted/50 transition-all duration-200"
        >
          <ChevronRight size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLastPage}
          disabled={currentPage >= totalPages}
          className="hover:text-foreground hover:bg-muted/50 transition-all duration-200"
        >
          <ChevronsRight size={20} />
        </Button>
      </div>
    </footer>
  )
}
