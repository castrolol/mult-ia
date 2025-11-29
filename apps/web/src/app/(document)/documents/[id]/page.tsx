import { DocumentViewer } from '@/components/document-viewer'

interface DocumentPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    name?: string
  }>
}

export default async function DocumentPage({
  params,
  searchParams,
}: DocumentPageProps) {
  const { id } = await params
  const { name } = await searchParams

  return <DocumentViewer documentId={id} documentName={name} />
}
