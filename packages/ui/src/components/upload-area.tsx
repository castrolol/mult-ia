'use client'

import { UploadFile } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
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
        className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-border bg-card/50 px-6 py-14"
        {...props}
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <UploadFile size={32} />
            </div>
            <div className="flex max-w-[480px] flex-col items-center gap-2">
              <p className="text-center text-lg font-bold leading-tight tracking-[-0.015em] text-foreground">
                Drag & drop PDF here
              </p>
              <p className="text-center text-sm font-normal leading-normal text-muted-foreground">
                Supports .pdf files up to 25MB
              </p>
            </div>
            <Button
              className="flex min-w-[84px] max-w-[480px]"
              variant="default"
            >
              <span className="truncate">Browse files</span>
            </Button>
          </div>
        </DropzoneEmptyState>
      </Dropzone>
    </div>
  )
}

