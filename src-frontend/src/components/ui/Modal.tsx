// Path: src-frontend/src/components/ui/Modal.tsx

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'

/**
 * Props for the modal dialog primitive.
 */
interface ModalProps {
  /** Controls whether the dialog is rendered. */
  open: boolean
  /** Called when the dialog should be dismissed. */
  onClose: () => void
  /** Optional heading displayed in the dialog header. */
  title?: string
  /** Modal body content. */
  children: ReactNode
  /** Width preset for the dialog panel. */
  size?: 'sm' | 'md' | 'lg'
  /** Allows closing the dialog by clicking the backdrop. */
  closeOnBackdrop?: boolean
  /** Additional class names applied to the panel. */
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Focus trap & keyboard close
  useEffect(() => {
    if (!open) return
    const el = dialogRef.current
    if (!el) return

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    first?.focus()
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        className={clsx(
          'relative z-10 w-full bg-white rounded-2xl shadow-dialog',
          'animate-scale-in',
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
            <h2 id={titleId} className="text-title-md text-on-surface">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full p-1.5 transition-colors"
              aria-label="Đóng"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
