'use client'

import { useState } from 'react'
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

type FileStatus = 'uploading' | 'processing' | 'completed' | 'error'

interface FileItem {
  id: string
  name: string
  size?: number
  status: FileStatus
  progress?: number
  error?: string
}

export function PDFUploader() {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'financial_report_q3.pdf',
      size: 12.8 * 1024 * 1024,
      status: 'uploading',
      progress: 45,
    },
    {
      id: '2',
      name: 'project_proposal_final.pdf',
      status: 'processing',
    },
    {
      id: '3',
      name: 'document_final_v2.pdf',
      status: 'completed',
    },
    {
      id: '4',
      name: 'invalid_document.docx',
      status: 'error',
      error: 'Error: Invalid file type',
    },
  ])

  const handleDrop = (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
  ) => {
    // Handle accepted files
    acceptedFiles.forEach((file) => {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      }
      setFiles((prev) => [...prev, newFile])

      // Simulate upload progress
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? {
                  ...f,
                  progress: Math.min((f.progress || 0) + 10, 100),
                }
              : f,
          ),
        )
      }, 500)

      setTimeout(() => {
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? { ...f, status: 'processing', progress: 100 }
              : f,
          ),
        )

        // Simulate processing completion
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id ? { ...f, status: 'completed' } : f,
            ),
          )
        }, 2000)
      }, 5000)
    })

    // Handle rejected files
    fileRejections.forEach((rejection) => {
      const newFile: FileItem = {
        id: Date.now().toString() + Math.random(),
        name: rejection.file.name,
        status: 'error',
        error: rejection.errors[0]?.message || 'Invalid file',
      }
      setFiles((prev) => [...prev, newFile])
    })
  }

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
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
                    Upload Your PDF Documents
                  </p>
                  <p className="text-base font-normal leading-relaxed text-muted-foreground">
                    Drag and drop files to start processing with MultiAI.
                  </p>
                </div>
              </div>

              <UploadArea onDrop={handleDrop} />

              <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground px-4 pb-3 pt-5">
                Processing Files
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
                              Processing...
                            </p>
                          ) : file.status === 'completed' ? (
                            <p className="text-sm font-normal leading-normal line-clamp-2 text-green-500">
                              Completed - Click to view
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
                            <span className="sr-only">Loading...</span>
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
                        cardContent
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
