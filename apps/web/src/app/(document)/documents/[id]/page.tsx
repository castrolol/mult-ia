import { DocumentViewer } from '@/components/document-viewer'

interface DocumentPageProps {
  searchParams: Promise<{
    name?: string
  }>
}

export default async function DocumentPage({
  searchParams,
}: DocumentPageProps) {
  const { name } = await searchParams

  return <DocumentViewer documentName={name} />
}
