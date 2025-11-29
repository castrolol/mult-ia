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
        'flex min-h-[72px] items-center gap-4 rounded-lg p-4 justify-between',
        variant === 'default' && 'bg-card/50 dark:bg-white/[0.03]',
        variant === 'error' && 'bg-destructive/10 dark:bg-destructive/10',
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
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
        variant === 'default' && 'text-muted-foreground bg-muted',
        variant === 'error' && 'text-destructive bg-destructive/20',
        variant === 'success' && 'text-green-500 bg-green-500/20',
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
