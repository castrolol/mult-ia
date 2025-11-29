'use client'

import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export interface HeaderProps {
  className?: string
  children?: ReactNode
}

export function Header({ className, children }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between whitespace-nowrap border-b border-border px-4 py-3',
        className,
      )}
    >
      {children}
    </header>
  )
}

export interface HeaderLogoProps {
  className?: string
  children?: ReactNode
}

export function HeaderLogo({ className, children }: HeaderLogoProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>{children}</div>
  )
}

export interface HeaderNavProps {
  className?: string
  children?: ReactNode
}

export function HeaderNav({ className, children }: HeaderNavProps) {
  return (
    <nav className={cn('hidden items-center gap-6 md:flex', className)}>
      {children}
    </nav>
  )
}

export interface HeaderNavLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string
}

export function HeaderNavLink({
  className,
  children,
  ...props
}: HeaderNavLinkProps) {
  return (
    <a
      className={cn(
        'text-sm font-medium leading-normal text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

export interface HeaderActionsProps {
  className?: string
  children?: ReactNode
}

export function HeaderActions({ className, children }: HeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-6', className)}>{children}</div>
  )
}
