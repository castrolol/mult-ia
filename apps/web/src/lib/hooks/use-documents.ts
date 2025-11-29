'use client'

import { useState, useEffect } from 'react'
import {
  apiClient,
  type Document,
  type Entity,
  type Deadline,
  type TimelineEvent,
} from '../api-client'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true)
        const data = await apiClient.getDocuments()
        setDocuments(data.documents || [])
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch documents',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getDocuments()
      setDocuments(data.documents || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }

  return { documents, loading, error, refetch }
}

export function useDocument(id: string | undefined) {
  const [document, setDocument] = useState<Document | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [analysis, setAnalysis] = useState<{
    summary: string
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical'
      factors: Array<{
        type: string
        description: string
        severity: 'critical' | 'high' | 'medium' | 'low'
        mitigation?: string
      }>
      recommendations: string[]
    }
    completedAt: Date
  } | null>(null)
  const [stats, setStats] = useState<{
    totalEntities: number
    totalDeadlines: number
    criticalDeadlines: number
    overdueDeadlines: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    async function fetchDocument() {
      try {
        setLoading(true)
        if (!id) {
          setError('Document ID is required')
          setLoading(false)
          return
        }
        const data = await apiClient.getDocument(id)
        setDocument(data.document)
        setEntities(data.entities || [])
        setDeadlines(data.deadlines || [])
        setTimeline(data.timeline || [])
        setAnalysis(data.analysis)
        setStats(data.stats)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch document',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [id])

  return {
    document,
    entities,
    deadlines,
    timeline,
    analysis,
    stats,
    loading,
    error,
  }
}

export function useUploadDocument() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    try {
      setUploading(true)
      setError(null)
      const result = await apiClient.uploadDocument(file)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}

export function useProcessDocument() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const process = async (documentId: string) => {
    try {
      setProcessing(true)
      setError(null)
      const result = await apiClient.processDocument(documentId)
      return result
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      throw err
    } finally {
      setProcessing(false)
    }
  }

  return { process, processing, error }
}
