'use client'

import Link from 'next/link'
import { useDocuments } from '@/lib/hooks/use-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/card'
import { Badge } from '@workspace/ui/badge'
import { Button } from '@workspace/ui/button'
import { FileText, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function DocumentsPage() {
    const { documents, loading, error } = useDocuments()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando documentos...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Erro ao carregar documentos</h2>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Documentos</h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie e visualize seus documentos
                    </p>
                </div>
                <Button asChild>
                    <Link href="/documents/upload">
                        <FileText className="mr-2 h-4 w-4" />
                        Novo Documento
                    </Link>
                </Button>
            </div>

            {documents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Nenhum documento encontrado</h3>
                        <p className="text-muted-foreground mb-6">
                            Comece fazendo upload do seu primeiro documento
                        </p>
                        <Button asChild>
                            <Link href="/documents/upload">Fazer Upload</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                        <Link key={doc.id} href={`/documents/${doc.id}?name=${encodeURIComponent(doc.filename)}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <FileText className="h-8 w-8 text-primary" />
                                        <StatusBadge status={doc.status} />
                                    </div>
                                    <CardTitle className="line-clamp-1">{doc.filename}</CardTitle>
                                    <CardDescription>
                                        {doc.totalPages ? `${doc.totalPages} páginas` : 'Processando...'}
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
                    ))}
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig = {
        pending: {
            label: 'Pendente',
            variant: 'secondary' as const,
            icon: Clock,
        },
        processing: {
            label: 'Processando',
            variant: 'default' as const,
            icon: Loader2,
        },
        completed: {
            label: 'Concluído',
            variant: 'default' as const,
            icon: CheckCircle2,
        },
        failed: {
            label: 'Falhou',
            variant: 'destructive' as const,
            icon: XCircle,
        },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
        <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
            {config.label}
        </Badge>
    )
}
