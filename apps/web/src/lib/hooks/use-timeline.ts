'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api-client'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const timelineKeys = {
  all: ['timeline'] as const,
  document: (documentId: string) => [...timelineKeys.all, documentId] as const,
  byPhase: (documentId: string) =>
    [...timelineKeys.document(documentId), 'byPhase'] as const,
  critical: (documentId: string, days?: number) =>
    [...timelineKeys.document(documentId), 'critical', days] as const,
  event: (documentId: string, eventId: string) =>
    [...timelineKeys.document(documentId), 'event', eventId] as const,
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para obter timeline completo de um documento
 */
export function useTimeline(documentId: string | undefined) {
  return useQuery({
    queryKey: timelineKeys.document(documentId || ''),
    queryFn: () => apiClient.getTimeline(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      timeline: data.timeline || [],
      relativeEvents: data.relativeEvents || [],
      unresolvedEvents: data.unresolvedEvents || [],
      allEvents: [
        ...(data.timeline || []),
        ...(data.relativeEvents || []),
        ...(data.unresolvedEvents || []),
      ],
      stats: data.stats,
    }),
  })
}

/**
 * Hook para obter timeline agrupado por fase
 */
export function useTimelineByPhase(documentId: string | undefined) {
  return useQuery({
    queryKey: timelineKeys.byPhase(documentId || ''),
    queryFn: () => apiClient.getTimelineByPhase(documentId!),
    enabled: !!documentId,
    select: (data) => ({
      phases: data.phases || [],
      totalEvents: data.totalEvents,
    }),
  })
}

/**
 * Hook para obter eventos críticos
 */
export function useTimelineCritical(
  documentId: string | undefined,
  days: number = 30,
) {
  return useQuery({
    queryKey: timelineKeys.critical(documentId || '', days),
    queryFn: () => apiClient.getTimelineCritical(documentId!, days),
    enabled: !!documentId,
    select: (data) => ({
      events: data.events || [],
      total: data.total,
    }),
  })
}

/**
 * Hook para obter detalhes de um evento
 */
export function useTimelineEvent(
  documentId: string | undefined,
  eventId: string | undefined,
) {
  return useQuery({
    queryKey: timelineKeys.event(documentId || '', eventId || ''),
    queryFn: () => apiClient.getTimelineEvent(documentId!, eventId!),
    enabled: !!documentId && !!eventId,
  })
}
