'use client'

import { useState } from 'react'
import {
  Calendar,
  AlertTriangle,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileText,
  Tag,
} from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { TimelineEvent, LicitacaoPhase, ImportanceLevel } from '@/lib/api-client'
import {
  licitacaoPhases,
  importanceLevels,
  formatDate,
  formatDaysRemaining,
  formatRelativeTime,
  ui,
} from '@/lib/i18n'

interface TimelineViewProps {
  events: TimelineEvent[]
  selectedId?: string
  onSelect?: (event: TimelineEvent) => void
  onCommentsClick?: (event: TimelineEvent) => void
  className?: string
}

export function TimelineView({
  events,
  selectedId,
  onSelect,
  onCommentsClick,
  className,
}: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{ui.nenhumEvento}</p>
        <p className="text-sm mt-1">{ui.processeDocumento}</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto', className)}>
      {events.map((event, index) => (
        <TimelineEventItem
          key={event.id}
          event={event}
          isSelected={selectedId === event.id}
          isLast={index === events.length - 1}
          onSelect={() => onSelect?.(event)}
          onCommentsClick={() => onCommentsClick?.(event)}
        />
      ))}
    </div>
  )
}

interface TimelineEventItemProps {
  event: TimelineEvent
  isSelected: boolean
  isLast: boolean
  onSelect: () => void
  onCommentsClick: () => void
}

function TimelineEventItem({
  event,
  isSelected,
  isLast,
  onSelect,
  onCommentsClick,
}: TimelineEventItemProps) {
  const importanceColor = getImportanceColor(event.importance)
  const phaseLabel = licitacaoPhases[event.phase] || event.phase
  const importanceLabel = importanceLevels[event.importance] || event.importance

  return (
    <div className="relative">
      {/* Linha vertical conectora */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}

      <div
        className={cn(
          'flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg mx-1',
          isSelected && 'bg-primary/10',
        )}
        onClick={onSelect}
      >
        {/* Indicador de timeline */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              importanceColor.bg,
            )}
          >
            {event.urgency.hasPenalty ? (
              <AlertTriangle size={16} className={importanceColor.text} />
            ) : (
              <Calendar size={16} className={importanceColor.text} />
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{event.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {phaseLabel}
                </span>
                <Badge
                  variant={importanceColor.variant}
                  className="text-[10px] px-1.5 py-0"
                >
                  {importanceLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock size={12} />
            {event.date ? (
              <span>
                {formatDate(event.date)}
                {event.urgency.daysUntilDeadline !== undefined && (
                  <span
                    className={cn(
                      'ml-2',
                      event.urgency.daysUntilDeadline <= 0
                        ? 'text-destructive font-medium'
                        : event.urgency.daysUntilDeadline <= 7
                          ? 'text-warning font-medium'
                          : '',
                    )}
                  >
                    ({formatDaysRemaining(event.date)})
                  </span>
                )}
              </span>
            ) : event.relativeTo ? (
              <span className="italic">
                {formatRelativeTime(
                  event.relativeTo.offset,
                  event.relativeTo.unit,
                  event.relativeTo.direction,
                )}
              </span>
            ) : (
              <span className="italic">Data não definida</span>
            )}
          </div>

          {/* Descrição */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {event.description}
          </p>

          {/* Penalidades */}
          {event.linkedPenalties.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-destructive mb-2">
              <AlertCircle size={12} />
              <span>
                {event.linkedPenalties.length} penalidade(s) vinculada(s)
              </span>
            </div>
          )}

          {/* Requisitos */}
          {event.linkedRequirements.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <FileText size={12} />
              <span>
                {event.linkedRequirements.length} requisito(s)
              </span>
            </div>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{event.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Ação de comentários */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onCommentsClick()
            }}
          >
            <MessageCircle size={12} className="mr-1" />
            {ui.comentarios} ({event.commentsCount || 0})
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Timeline agrupado por fase
 */
interface TimelineByPhaseProps {
  phases: Array<{
    phase: LicitacaoPhase
    order: number
    events: TimelineEvent[]
    count: number
  }>
  selectedId?: string
  onSelect?: (event: TimelineEvent) => void
  onCommentsClick?: (event: TimelineEvent) => void
  className?: string
}

export function TimelineByPhase({
  phases,
  selectedId,
  onSelect,
  onCommentsClick,
  className,
}: TimelineByPhaseProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(phases.slice(0, 3).map((p) => p.phase)),
  )

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  if (phases.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{ui.nenhumEvento}</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto', className)}>
      {phases.map((phaseGroup) => {
        const isExpanded = expandedPhases.has(phaseGroup.phase)
        const phaseLabel = licitacaoPhases[phaseGroup.phase] || phaseGroup.phase

        return (
          <div key={phaseGroup.phase} className="mb-2">
            {/* Cabeçalho da fase */}
            <button
              className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => togglePhase(phaseGroup.phase)}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{phaseLabel}</span>
              <Badge variant="secondary" className="text-[10px]">
                {phaseGroup.count}
              </Badge>
            </button>

            {/* Eventos da fase */}
            {isExpanded && (
              <div className="ml-4 border-l-2 border-muted">
                {phaseGroup.events.map((event, index) => (
                  <TimelineEventItem
                    key={event.id}
                    event={event}
                    isSelected={selectedId === event.id}
                    isLast={index === phaseGroup.events.length - 1}
                    onSelect={() => onSelect?.(event)}
                    onCommentsClick={() => onCommentsClick?.(event)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Componente de detalhes do evento
 */
interface EventDetailProps {
  event: TimelineEvent | null
  className?: string
}

export function EventDetail({ event, className }: EventDetailProps) {
  if (!event) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <p>{ui.selecioneItem}</p>
      </div>
    )
  }

  const phaseLabel = licitacaoPhases[event.phase] || event.phase
  const importanceLabel = importanceLevels[event.importance] || event.importance
  const importanceColor = getImportanceColor(event.importance)

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={importanceColor.variant}>{importanceLabel}</Badge>
          <span className="text-xs text-muted-foreground">{phaseLabel}</span>
        </div>
        <h3 className="text-lg font-semibold">{event.title}</h3>
      </div>

      {/* Data */}
      <div className="flex items-center gap-2 text-sm">
        <Calendar size={16} className="text-muted-foreground" />
        <span>
          {event.date ? formatDate(event.date) : event.dateRaw || 'Data não definida'}
        </span>
        {event.urgency.daysUntilDeadline !== undefined && event.date && (
          <Badge
            variant={
              event.urgency.daysUntilDeadline <= 0
                ? 'destructive'
                : event.urgency.daysUntilDeadline <= 7
                  ? 'warning'
                  : 'secondary'
            }
          >
            {formatDaysRemaining(event.date)}
          </Badge>
        )}
      </div>

      {/* Descrição */}
      <div>
        <h4 className="text-sm font-medium mb-1">Descrição</h4>
        <p className="text-sm text-muted-foreground">{event.description}</p>
      </div>

      {/* Ação requerida */}
      {event.actionRequired && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-primary mb-1">
            Ação Requerida
          </h4>
          <p className="text-sm">{event.actionRequired}</p>
        </div>
      )}

      {/* Penalidades */}
      {event.linkedPenalties.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle size={14} />
            Penalidades Vinculadas
          </h4>
          <ul className="space-y-1">
            {event.linkedPenalties.map((penalty) => (
              <li key={penalty.entityId} className="text-sm">
                <span className="font-medium">{penalty.type}:</span>{' '}
                {penalty.description}
                {penalty.value && (
                  <span className="text-destructive ml-1">({penalty.value})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requisitos */}
      {event.linkedRequirements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <FileText size={14} />
            Requisitos
          </h4>
          <ul className="space-y-1">
            {event.linkedRequirements.map((req) => (
              <li key={req.entityId} className="text-sm flex items-start gap-2">
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5',
                    req.mandatory
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted',
                  )}
                >
                  {req.mandatory ? 'Obrigatório' : 'Opcional'}
                </span>
                <span>{req.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-muted-foreground" />
          {event.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Páginas de origem */}
      {event.sourcePages.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Páginas: {event.sourcePages.join(', ')}
        </div>
      )}
    </div>
  )
}

// Helpers
function getImportanceColor(importance: ImportanceLevel): {
  bg: string
  text: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  switch (importance) {
    case 'CRITICAL':
      return {
        bg: 'bg-destructive/20',
        text: 'text-destructive',
        variant: 'destructive',
      }
    case 'HIGH':
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-500',
        variant: 'default',
      }
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-600',
        variant: 'secondary',
      }
    case 'LOW':
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        variant: 'outline',
      }
  }
}

