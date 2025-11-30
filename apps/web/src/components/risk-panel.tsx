'use client'

import { useRisks } from '@/lib/hooks'
import type { Risk, ImportanceLevel, ProbabilityLevel } from '@/lib/api-client'
import { importanceLevels, probabilityLevels, ui } from '@/lib/i18n'
import { cn } from '@workspace/ui/lib/utils'
import { Badge } from '@workspace/ui/components/badge'
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Shield,
} from 'lucide-react'

interface RiskPanelProps {
  documentId: string
  activeRiskId?: string | null
  onSelectRisk?: (risk: Risk) => void
  className?: string
}

export function RiskPanel({
  documentId,
  activeRiskId,
  onSelectRisk,
  className,
}: RiskPanelProps) {
  const { data, isLoading, error } = useRisks(documentId)
  const risks = data?.risks || []
  const stats = data?.stats

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-32', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center text-destructive', className)}>
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>{error.message}</p>
      </div>
    )
  }

  if (risks.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum risco identificado</p>
        <p className="text-sm mt-1">Processe o documento para analisar riscos</p>
      </div>
    )
  }

  const criticalCount =
    (stats?.bySeverity?.CRITICAL || 0) + (stats?.bySeverity?.HIGH || 0)

  return (
    <div className={cn('space-y-6 animate-in slide-in-from-right-4 duration-300', className)}>
      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-destructive">Atenção Crítica</h3>
            <p className="text-xs text-destructive/80 mt-1">
              Este documento apresenta {criticalCount} risco(s) de alto impacto que
              exigem análise imediata.
            </p>
          </div>
        </div>
      )}

      {/* Risk Cards */}
      <div className="space-y-4">
        {risks.map((risk) => (
          <RiskCard
            key={risk.id}
            risk={risk}
            isActive={activeRiskId === risk.id}
            onSelect={() => onSelectRisk?.(risk)}
          />
        ))}
      </div>
    </div>
  )
}

interface RiskCardProps {
  risk: Risk
  isActive: boolean
  onSelect: () => void
}

function RiskCard({ risk, isActive, onSelect }: RiskCardProps) {
  const severityLabel = importanceLevels[risk.severity] || risk.severity
  const probabilityLabel = probabilityLevels[risk.probability] || risk.probability
  const severityColor = getSeverityColor(risk.severity)
  const probabilityColor = getProbabilityColor(risk.probability)

  return (
    <div
      onClick={onSelect}
      className={cn(
        'border rounded-xl bg-card p-5 cursor-pointer transition-all duration-200 group relative overflow-hidden',
        isActive
          ? 'border-destructive ring-1 ring-destructive/20 shadow-md'
          : 'border-border hover:border-destructive/50 hover:shadow-sm'
      )}
    >
      {/* Severity/Probability Badges */}
      <div className="flex gap-2 mb-3">
        <Badge variant={severityColor.variant} className="text-[10px] uppercase tracking-wider">
          Severidade: {severityLabel}
        </Badge>
        <Badge variant={probabilityColor.variant} className="text-[10px] uppercase tracking-wider">
          Probabilidade: {probabilityLabel}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
        <AlertTriangle
          className={cn('w-4 h-4', severityColor.iconClass)}
        />
        {risk.title}
      </h4>

      {/* Category */}
      {risk.category && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {risk.category}
            {risk.subcategory && ` / ${risk.subcategory}`}
          </span>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {risk.description}
      </p>

      {/* Trigger & Consequence */}
      {(risk.trigger || risk.consequence) && (
        <div className="space-y-2 mb-4">
          {risk.trigger && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <h5 className="text-xs font-bold text-foreground mb-1">{ui.gatilho}:</h5>
              <p className="text-xs text-muted-foreground">{risk.trigger}</p>
            </div>
          )}
          {risk.consequence && (
            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/10">
              <h5 className="text-xs font-bold text-destructive mb-1">
                {ui.consequencia}:
              </h5>
              <p className="text-xs text-muted-foreground">{risk.consequence}</p>
            </div>
          )}
        </div>
      )}

      {/* Mitigation Box */}
      {risk.mitigation && (
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
          <h5 className="text-xs font-bold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {ui.mitigacao} (Recomendação IA):
          </h5>
          <p className="text-xs text-green-700/80 dark:text-green-400/80 leading-snug">
            {risk.mitigation.action}
          </p>
          {risk.mitigation.deadline && (
            <p className="text-[10px] text-green-600/70 dark:text-green-500/70 mt-1">
              Prazo: {risk.mitigation.deadline}
            </p>
          )}
          {risk.mitigation.cost && (
            <p className="text-[10px] text-green-600/70 dark:text-green-500/70">
              Custo estimado: {risk.mitigation.cost}
            </p>
          )}
        </div>
      )}

      {/* Link to Page */}
      {risk.sources && risk.sources.length > 0 && (
        <div className="mt-3 flex justify-end">
          <span className="text-xs text-primary font-medium group-hover:underline flex items-center gap-0.5">
            Ver no documento (p. {risk?.sources?.[0]?.pageNumber || "N/A"})
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Componente de detalhe do risco selecionado
 */
interface RiskDetailProps {
  risk: Risk | null
  className?: string
}

export function RiskDetail({ risk, className }: RiskDetailProps) {
  if (!risk) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <p>{ui.selecioneItem}</p>
      </div>
    )
  }

  const severityLabel = importanceLevels[risk.severity] || risk.severity
  const probabilityLabel = probabilityLevels[risk.probability] || risk.probability
  const severityColor = getSeverityColor(risk.severity)

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={severityColor.variant}>{severityLabel}</Badge>
          <span className="text-xs text-muted-foreground">{probabilityLabel}</span>
        </div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className={cn('w-5 h-5', severityColor.iconClass)} />
          {risk.title}
        </h3>
      </div>

      {/* Category */}
      {risk.category && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Categoria:</span> {risk.category}
          {risk.subcategory && ` / ${risk.subcategory}`}
        </div>
      )}

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium mb-1">Descrição</h4>
        <p className="text-sm text-muted-foreground">{risk.description}</p>
      </div>

      {/* Trigger */}
      {risk.trigger && (
        <div>
          <h4 className="text-sm font-medium mb-1">{ui.gatilho}</h4>
          <p className="text-sm text-muted-foreground">{risk.trigger}</p>
        </div>
      )}

      {/* Consequence */}
      {risk.consequence && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-destructive mb-1 flex items-center gap-1">
            <AlertTriangle size={14} />
            {ui.consequencia}
          </h4>
          <p className="text-sm">{risk.consequence}</p>
        </div>
      )}

      {/* Mitigation */}
      {risk.mitigation && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
            <CheckCircle2 size={14} />
            {ui.mitigacao}
          </h4>
          <p className="text-sm">{risk.mitigation.action}</p>
          {risk.mitigation.deadline && (
            <p className="text-xs text-muted-foreground mt-1">
              Prazo: {risk.mitigation.deadline}
            </p>
          )}
          {risk.mitigation.cost && (
            <p className="text-xs text-muted-foreground">
              Custo: {risk.mitigation.cost}
            </p>
          )}
        </div>
      )}

      {/* Source Pages */}
      {risk.sources && risk.sources.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Páginas: {risk.sources.map((s) => s.pageNumber).join(', ')}
        </div>
      )}
    </div>
  )
}

// Helpers
function getSeverityColor(severity: ImportanceLevel): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  iconClass: string
} {
  switch (severity) {
    case 'CRITICAL':
      return { variant: 'destructive', iconClass: 'text-destructive' }
    case 'HIGH':
      return { variant: 'default', iconClass: 'text-orange-500' }
    case 'MEDIUM':
      return { variant: 'secondary', iconClass: 'text-yellow-600' }
    case 'LOW':
    default:
      return { variant: 'outline', iconClass: 'text-muted-foreground' }
  }
}

function getProbabilityColor(probability: ProbabilityLevel): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  switch (probability) {
    case 'CERTAIN':
      return { variant: 'destructive' }
    case 'LIKELY':
      return { variant: 'default' }
    case 'POSSIBLE':
      return { variant: 'secondary' }
    case 'UNLIKELY':
    default:
      return { variant: 'outline' }
  }
}

