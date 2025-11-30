'use client'

import { FileUp } from 'lucide-react'
import {
  Dropzone,
  DropzoneEmptyState,
  type DropzoneProps,
} from '@workspace/ui/components/dropzone'
import { cn } from '@workspace/ui/lib/utils'

export interface UploadAreaProps extends Omit<DropzoneProps, 'children'> {
  className?: string
}

export function UploadArea({ className, ...props }: UploadAreaProps) {
  return (
    <div className={cn('flex flex-col p-4', className)}>
      <Dropzone
        accept={{
          'application/pdf': ['.pdf'],
        }}
        maxSize={25 * 1024 * 1024}
        className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm px-6 py-16 transition-all duration-200 hover:border-primary/40 hover:bg-card/40 hover:shadow-md"
        {...props}
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center gap-6">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary shadow-sm">
              <FileUp size={36} />
            </div>
            <div className="flex max-w-[480px] flex-col items-center gap-2.5">
              <p className="text-center text-xl font-bold leading-tight tracking-tight text-foreground">
                Arraste e solte o PDF aqui
              </p>
              <p className="text-center text-sm font-normal leading-relaxed text-muted-foreground">
                Suporta arquivos .pdf até 25MB
              </p>
            </div>
            {/* Usar span estilizado em vez de Button para evitar botões aninhados */}
            <span
              className="flex min-w-[84px] max-w-[480px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <span className="truncate">Procurar arquivos</span>
            </span>
          </div>
        </DropzoneEmptyState>
      </Dropzone>
    </div>
  )
}
