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
        'flex items-center justify-between whitespace-nowrap border-b border-border/60 bg-card/50 backdrop-blur-sm px-6 py-4 shadow-sm',
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
        'text-sm font-medium leading-normal text-muted-foreground hover:text-foreground transition-all duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-200 hover:after:w-full',
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
