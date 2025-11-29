'use client'

import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export interface FileListProps {
  className?: string
  children?: ReactNode
}

export function FileList({ className, children }: FileListProps) {
  return (
    <div className={cn('flex flex-col gap-2 px-4', className)}>{children}</div>
  )
}

export interface FileListItemProps {
  className?: string
  children?: ReactNode
  variant?: 'default' | 'error'
}

export function FileListItem({
  className,
  children,
  variant = 'default',
}: FileListItemProps) {
  return (
    <div
      className={cn(
        'flex min-h-[80px] items-center gap-4 rounded-xl p-4 justify-between border transition-all duration-200',
        variant === 'default' &&
          'bg-card/60 border-border/40 shadow-sm hover:shadow-md hover:border-border/60',
        variant === 'error' &&
          'bg-destructive/10 border-destructive/20 dark:bg-destructive/10',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface FileListItemContentProps {
  className?: string
  children?: ReactNode
}

export function FileListItemContent({
  className,
  children,
}: FileListItemContentProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>{children}</div>
  )
}

export interface FileListItemIconProps {
  className?: string
  children?: ReactNode
  variant?: 'default' | 'error' | 'success'
}

export function FileListItemIcon({
  className,
  children,
  variant = 'default',
}: FileListItemIconProps) {
  return (
    <div
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm',
        variant === 'default' &&
          'text-muted-foreground bg-muted/60 border border-border/40',
        variant === 'error' &&
          'text-destructive bg-destructive/15 border border-destructive/20',
        variant === 'success' &&
          'text-green-600 bg-green-500/15 border border-green-500/20 dark:text-green-400',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface FileListItemInfoProps {
  className?: string
  children?: ReactNode
}

export function FileListItemInfo({
  className,
  children,
}: FileListItemInfoProps) {
  return (
    <div className={cn('flex flex-col justify-center', className)}>
      {children}
    </div>
  )
}

export interface FileListItemActionsProps {
  className?: string
  children?: ReactNode
}

export function FileListItemActions({
  className,
  children,
}: FileListItemActionsProps) {
  return (
    <div className={cn('shrink-0', className)}>
      <div className={cn('flex items-center gap-3', className)}>{children}</div>
    </div>
  )
}
