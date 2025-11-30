'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Check, X, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { UploadArea } from '@workspace/ui/components/upload-area'
import {
  FileList,
  FileListItem,
  FileListItemContent,
  FileListItemIcon,
  FileListItemInfo,
  FileListItemActions,
} from '@workspace/ui/components/file-list'
import type { FileRejection } from 'react-dropzone'
import { useUploadDocument, useDocuments } from '@/lib/hooks'
import { documentStatus as statusLabels, ui } from '@/lib/i18n'
import type { DocumentStatus } from '@/lib/api-client'

type FileStatus = 'uploading' | 'processing' | 'completed' | 'error'

interface FileItem {
  id: string
  name: string
  size?: number
  status: FileStatus
  progress?: number
  error?: string
}

function mapBackendStatus(status: DocumentStatus): FileStatus {
  switch (status) {
    case 'PENDING':
      return 'uploading'
    case 'PROCESSING':
      return 'processing'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'error'
    default:
      return 'uploading'
  }
}

function getStatusLabel(status: FileStatus): string {
  switch (status) {
    case 'uploading':
      return statusLabels.PENDING
    case 'processing':
      return statusLabels.PROCESSING
    case 'completed':
      return statusLabels.COMPLETED
    case 'error':
      return statusLabels.FAILED
    default:
      return ''
  }
}

export function PDFUploader() {
  const router = useRouter()
  const uploadMutation = useUploadDocument()
  const { data: documentsData, refetch } = useDocuments()
  const [localFiles, setLocalFiles] = useState<FileItem[]>([])

  // Combinar arquivos locais (em upload) com documentos da API
  const files = useMemo(() => {
    const apiFiles: FileItem[] = (documentsData?.documents || []).map((doc) => ({
      id: doc.id || doc._id || '',
      name: doc.filename,
      status: mapBackendStatus(doc.status),
      error: doc.error,
    }))

    // Filtrar arquivos locais que já foram substituídos por documentos da API
    const apiIds = new Set(apiFiles.map((f) => f.id))
    const pendingLocalFiles = localFiles.filter((f) => !apiIds.has(f.id))

    return [...pendingLocalFiles, ...apiFiles]
  }, [documentsData?.documents, localFiles])

  const handleDrop = async (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
  ) => {
    // Processar arquivos aceitos
    for (const file of acceptedFiles) {
      const tempId = `temp-${Date.now()}-${Math.random()}`
      const newFile: FileItem = {
        id: tempId,
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      }
      setLocalFiles((prev) => [...prev, newFile])

      try {
        // Simular progresso
        const progressInterval = setInterval(() => {
          setLocalFiles((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? {
                    ...f,
                    progress: Math.min((f.progress || 0) + 20, 90),
                  }
                : f,
            ),
          )
        }, 200)

        const result = await uploadMutation.mutateAsync(file)

        clearInterval(progressInterval)

        // Atualizar arquivo com ID real do documento
        setLocalFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  id: result.documentId,
                  status: 'processing',
                  progress: 100,
                }
              : f,
          ),
        )

        // Navegar para documento após um curto delay
        setTimeout(() => {
          router.push(
            `/documents/${result.documentId}?name=${encodeURIComponent(result.filename)}`,
          )
        }, 1000)
      } catch (err) {
        setLocalFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  status: 'error',
                  error:
                    err instanceof Error ? err.message : ui.erroUpload,
                }
              : f,
          ),
        )
      }
    }

    // Processar arquivos rejeitados
    fileRejections.forEach((rejection) => {
      const newFile: FileItem = {
        id: `rejected-${Date.now()}-${Math.random()}`,
        name: rejection.file.name,
        status: 'error',
        error: rejection.errors[0]?.message || 'Arquivo inválido',
      }
      setLocalFiles((prev) => [...prev, newFile])
    })
  }

  const handleDelete = (id: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full grow flex-col">
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
          <div className="flex w-full max-w-4xl flex-col gap-8">
            <main className="flex flex-col gap-8">
              <div className="flex flex-wrap justify-between gap-3 px-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-4xl font-black leading-tight tracking-tight text-foreground">
                    {ui.uploadTitulo}
                  </p>
                  <p className="text-base font-normal leading-relaxed text-muted-foreground">
                    {ui.uploadDescricao}
                  </p>
                </div>
              </div>

              <UploadArea onDrop={handleDrop} />

              <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground px-4 pb-3 pt-5">
                {ui.arquivosProcessando}
              </h2>

              <FileList>
                {files.map((file) => {
                  const isClickable = file.status === 'completed'
                  const cardContent = (
                    <>
                      <FileListItemContent>
                        <FileListItemIcon
                          variant={
                            file.status === 'error'
                              ? 'error'
                              : file.status === 'completed'
                                ? 'success'
                                : 'default'
                          }
                        >
                          <FileText size={24} />
                        </FileListItemIcon>
                        <FileListItemInfo>
                          <p className="text-base font-medium leading-normal line-clamp-1 text-foreground">
                            {file.name}
                          </p>
                          {file.status === 'error' ? (
                            <p className="text-sm font-normal leading-normal line-clamp-2 text-destructive">
                              {file.error}
                            </p>
                          ) : file.status === 'processing' ? (
                            <p className="text-sm font-normal leading-normal line-clamp-2 text-primary">
                              {getStatusLabel(file.status)}
                            </p>
                          ) : file.status === 'completed' ? (
                            <p className="text-sm font-normal leading-normal line-clamp-2 text-green-500">
                              {ui.concluido} - {ui.cliqueParaVer}
                            </p>
                          ) : (
                            <p className="text-sm font-normal leading-normal line-clamp-2 text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </FileListItemInfo>
                      </FileListItemContent>
                      <FileListItemActions>
                        {file.status === 'uploading' && (
                          <>
                            <div className="w-28 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${file.progress || 0}%` }}
                              />
                            </div>
                            <p className="w-10 text-right text-sm font-medium leading-normal text-muted-foreground">
                              {file.progress}%
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDelete(file.id)
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={20} />
                            </Button>
                          </>
                        )}
                        {file.status === 'processing' && (
                          <div
                            className="flex items-center justify-center"
                            role="status"
                          >
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="sr-only">{ui.processando}</span>
                          </div>
                        )}
                        {file.status === 'completed' && (
                          <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                            <Check size={20} />
                          </div>
                        )}
                        {file.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(file.id)
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 size={20} />
                          </Button>
                        )}
                      </FileListItemActions>
                    </>
                  )

                  return (
                    <FileListItem
                      key={file.id}
                      variant={file.status === 'error' ? 'error' : 'default'}
                      className={
                        isClickable
                          ? 'cursor-pointer hover:bg-card/80 transition-colors'
                          : ''
                      }
                    >
                      {isClickable ? (
                        <Link
                          href={`/documents/${file.id}?name=${encodeURIComponent(file.name)}`}
                          className="flex w-full items-center justify-between"
                        >
                          {cardContent}
                        </Link>
                      ) : (
                        <div className="flex w-full items-center justify-between">
                          {cardContent}
                        </div>
                      )}
                    </FileListItem>
                  )
                })}
              </FileList>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
