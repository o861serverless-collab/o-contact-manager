// Path: src-frontend/src/components/ui/EmptyState.tsx

import { type ReactNode } from 'react'
import { clsx } from 'clsx'

/**
 * Props for empty and zero-data states.
 */
interface EmptyStateProps {
  /** Optional illustration or icon. */
  icon?: ReactNode
  /** Main empty-state heading. */
  title: string
  /** Supporting copy below the title. */
  description?: string
  /** Optional CTA element rendered below the description. */
  action?: ReactNode
  /** Additional class names for layout overrides. */
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-16 px-6 text-center', className)}>
      {icon && (
        <div className="text-on-surface-variant/40 mb-1">{icon}</div>
      )}
      <h3 className="text-title-md text-on-surface">{title}</h3>
      {description && (
        <p className="text-body-md text-on-surface-variant max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
