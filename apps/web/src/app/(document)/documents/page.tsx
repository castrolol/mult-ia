'use client'

import Link from 'next/link'
import { useDocuments } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { FileText, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { documentStatus as statusLabels, ui } from '@/lib/i18n'
import type { DocumentStatus } from '@/lib/api-client'

export default function DocumentsPage() {
  const { data, isLoading, error } = useDocuments()
  const documents = data?.documents || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{ui.carregandoDocumentos}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{ui.erroCarregarDocumentos}</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{ui.documentos}</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e visualize seus documentos
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <FileText className="mr-2 h-4 w-4" />
            {ui.novoDocumento}
          </Link>
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{ui.nenhumDocumento}</h3>
            <p className="text-muted-foreground mb-6">
              {ui.comeceFazendoUpload}
            </p>
            <Button asChild>
              <Link href="/">{ui.fazerUpload}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const docId = doc.id || doc._id || ''
            return (
              <Link
                key={docId}
                href={`/documents/${docId}?name=${encodeURIComponent(doc.filename)}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-primary" />
                      <StatusBadge status={doc.status} />
                    </div>
                    <CardTitle className="line-clamp-1">{doc.filename}</CardTitle>
                    <CardDescription>
                      {doc.totalPages
                        ? `${doc.totalPages} ${ui.paginas}`
                        : statusLabels.PROCESSING}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {doc.error && (
                      <p className="text-sm text-destructive mt-2 line-clamp-2">
                        {doc.error}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const statusConfig = {
    PENDING: {
      label: statusLabels.PENDING,
      variant: 'secondary' as const,
      icon: Clock,
    },
    PROCESSING: {
      label: statusLabels.PROCESSING,
      variant: 'default' as const,
      icon: Loader2,
    },
    COMPLETED: {
      label: statusLabels.COMPLETED,
      variant: 'default' as const,
      icon: CheckCircle2,
    },
    FAILED: {
      label: statusLabels.FAILED,
      variant: 'destructive' as const,
      icon: XCircle,
    },
  }

  const config = statusConfig[status] || statusConfig.PENDING
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  )
}
