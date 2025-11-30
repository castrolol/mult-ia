'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  X,
  Trash2,
  Loader2,
  ArrowRight,
  File,
  Zap,
  Lock,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { UploadArea } from '@workspace/ui/components/upload-area'
import { toast } from '@workspace/ui/components/sonner'
import type { FileRejection } from 'react-dropzone'
import { useUploadDocument, useDocuments } from '@/lib/hooks'
import { ui } from '@/lib/i18n'
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

export function PDFUploader() {
  const router = useRouter()
  const uploadMutation = useUploadDocument()
  const { data: documentsData, isLoading: docsLoading } = useDocuments()
  const [localFiles, setLocalFiles] = useState<FileItem[]>([])

  // Documentos recentes da API (últimos 5)
  const recentDocuments = useMemo(() => {
    const docs = documentsData?.documents || []
    return docs.slice(0, 5).map((doc) => ({
      id: doc.id || doc._id || '',
      name: doc.filename,
      status: mapBackendStatus(doc.status),
      pages: doc.totalPages,
      date: new Date(doc.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      }),
    }))
  }, [documentsData?.documents])

  const handleDrop = async (
    acceptedFiles: File[],
    fileRejections: FileRejection[]
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
        await uploadMutation.mutateAsync(file)

        // Navegar para lista de documentos e mostrar toast
        toast.info('O processamento começará em breve', {
          description: 'Você será notificado quando o documento estiver pronto.',
          duration: 5000,
        })
        router.push('/documents')
      } catch (err) {
        setLocalFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  status: 'error',
                  error: err instanceof Error ? err.message : ui.erroUpload,
                }
              : f
          )
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

  const handleDocumentClick = (docId: string, docName: string) => {
    router.push(`/documents/${docId}?name=${encodeURIComponent(docName)}`)
  }

  return (
    <div className="min-h-screen bg-muted/30 relative overflow-x-hidden flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.3)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Background Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-8 lg:py-12">
        {/* Brand Header */}
        <div className="text-center mb-8 lg:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="w-16 h-16 relative">
              <svg
                viewBox="0 0 100 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xl"
              >
                <path
                  d="M20 10 C 12 10 5 17 5 25 V 95 C 5 103 12 110 20 110 H 80 C 88 110 95 103 95 95 V 35 L 70 10 H 20 Z"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="hsl(var(--card))"
                  strokeLinejoin="round"
                  className="text-foreground"
                />
                <path
                  d="M70 10 V 35 H 95"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinejoin="round"
                  fill="hsl(var(--card))"
                  className="text-foreground"
                />
                <path
                  d="M25 50 H 75"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-foreground"
                />
                <path
                  d="M25 70 H 65"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-foreground"
                />
                <path
                  d="M10 55 C 5 40 25 20 45 25 C 65 30 70 50 60 60 C 50 70 30 70 25 65 C 15 60 15 60 10 55 Z"
                  fill="hsl(var(--primary))"
                  opacity="0.9"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <path
                  d="M60 65 C 75 55 90 65 85 85 C 80 105 60 100 55 90 C 50 80 55 70 60 65 Z"
                  fill="hsl(var(--chart-4))"
                  opacity="0.9"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </svg>
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter">
              Mult.
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                IA
              </span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Inteligência Artificial para Análise Contratual Multivisual
          </p>
        </div>

        {/* Card Container - Split Layout */}
        <div className="w-full max-w-6xl bg-card rounded-[2rem] shadow-2xl border border-border overflow-hidden flex flex-col lg:flex-row min-h-[600px] transition-all duration-500 hover:shadow-primary/5 animate-in zoom-in-95 duration-500 mb-8">
          {/* LEFT: Upload Area */}
          <div className="flex-[1.5] p-8 lg:p-12 xl:p-16 flex flex-col justify-center bg-card relative order-2 lg:order-1">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Comece sua análise
              </h2>
              <p className="text-muted-foreground text-lg">
                Faça upload do Edital ou Contrato para gerar insights automáticos.
              </p>
            </div>

            {/* Upload Drop Zone */}
            <UploadArea
              onDrop={handleDrop}
              className="flex-1 min-h-[300px]"
            />

            {/* Error Files */}
            {localFiles.filter((f) => f.status === 'error').length > 0 && (
              <div className="mt-4 space-y-2">
                {localFiles
                  .filter((f) => f.status === 'error')
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                    >
                      <X className="w-4 h-4 text-destructive" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-destructive">{file.error}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
              </div>
            )}

            {/* Uploading indicator */}
            {uploadMutation.isPending && (
              <div className="mt-4 flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium">Enviando documento...</p>
                  <p className="text-xs text-muted-foreground">
                    Você será redirecionado automaticamente
                  </p>
                </div>
              </div>
            )}

            {/* Recent Documents */}
            {recentDocuments.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Documentos Recentes
                </p>
                <div className="flex flex-wrap gap-4">
                  {recentDocuments.slice(0, 3).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentClick(doc.id, doc.name)}
                      className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group min-w-[240px] flex-1 lg:flex-none"
                    >
                      <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center text-primary shadow-sm border border-border group-hover:scale-105 transition-transform shrink-0">
                        <File className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {doc.pages ? `${doc.pages} págs` : 'Processando'}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {doc.date}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {recentDocuments.length > 3 && (
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
                  >
                    Ver todos os documentos
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {/* Empty state for docs */}
            {!docsLoading && recentDocuments.length === 0 && (
              <div className="mt-8 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento processado ainda</p>
              </div>
            )}
          </div>

          {/* RIGHT: Value Proposition (Dark Panel) */}
          <div className="lg:w-[400px] bg-foreground p-12 flex flex-col justify-between relative overflow-hidden order-1 lg:order-2 shrink-0">
            {/* Abstract Decor */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-8">
                <Zap className="w-3 h-3" />
                Potencializado por IA
              </div>

              <h3 className="text-3xl font-bold text-background mb-6 leading-tight">
                Revele o invisível nos seus contratos.
              </h3>

              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-primary shrink-0 border border-muted/20">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-background font-bold text-lg">
                      Visão Multidimensional
                    </h4>
                    <p className="text-muted text-sm mt-1 leading-relaxed">
                      Alterne entre Linha do Tempo, Matriz de Riscos e Árvore
                      Hierárquica.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-destructive shrink-0 border border-muted/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-background font-bold text-lg">
                      Proteção Jurídica
                    </h4>
                    <p className="text-muted text-sm mt-1 leading-relaxed">
                      Identificação automática de cláusulas abusivas e prazos
                      críticos.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-green-400 shrink-0 border border-muted/20">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-background font-bold text-lg">
                      Conformidade Total
                    </h4>
                    <p className="text-muted text-sm mt-1 leading-relaxed">
                      Validação cruzada de requisitos técnicos e documentais.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 pt-8 border-t border-muted/20">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {['A', 'B', 'C'].map((letter, i) => (
                    <div
                      key={letter}
                      className="w-10 h-10 rounded-full border-2 border-foreground bg-muted/20 flex items-center justify-center text-xs text-background font-bold"
                      style={{ zIndex: 30 - i * 10 }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-background text-sm font-bold">
                    Confiança do Mercado
                  </p>
                  <p className="text-muted text-xs">Utilizado por +500 analistas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-8 text-muted-foreground text-sm font-medium">
          <span>© 2025 Mult.IA</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <a href="#" className="hover:text-primary transition-colors">
            Privacidade
          </a>
          <span className="w-1 h-1 bg-border rounded-full" />
          <a href="#" className="hover:text-primary transition-colors">
            Segurança
          </a>
        </div>
      </div>
    </div>
  )
}
