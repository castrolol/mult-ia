'use client'

import { useState, useEffect } from 'react'
import {
  apiClient,
  type Entity,
  type Deadline,
  type TimelineEvent,
} from '../api-client'

export function useDocumentEntities(documentId: string | undefined) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    async function fetchEntities() {
      try {
        setLoading(true)
        if (!documentId) {
          setError('Document ID is required')
          setLoading(false)
          return
        }
        const data = await apiClient.getDocumentEntities(documentId)
        setEntities(data.entities)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch entities',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchEntities()
  }, [documentId])

  return { entities, loading, error }
}

export function useDocumentDeadlines(documentId: string | undefined) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    async function fetchDeadlines() {
      try {
        setLoading(true)
        if (!documentId) {
          setError('Document ID is required')
          setLoading(false)
          return
        }
        const data = await apiClient.getDocumentDeadlines(documentId)
        setDeadlines(data.deadlines)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch deadlines',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchDeadlines()
  }, [documentId])

  return { deadlines, loading, error }
}

export function useDocumentTimeline(documentId: string | undefined) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    async function fetchTimeline() {
      try {
        setLoading(true)
        if (!documentId) {
          setError('Document ID is required')
          setLoading(false)
          return
        }
        const data = await apiClient.getDocumentTimeline(documentId)
        setTimeline(data.events)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch timeline',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTimeline()
  }, [documentId])

  return { timeline, loading, error }
}
