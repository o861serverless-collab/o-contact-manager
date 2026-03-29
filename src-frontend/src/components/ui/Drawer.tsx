// Path: src-frontend/src/components/ui/Drawer.tsx

import { useEffect, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'

type DrawerSide = 'bottom' | 'right' | 'left'

/**
 * Props for the responsive drawer primitive.
 */
interface DrawerProps {
  /** Controls whether the drawer is rendered. */
  open: boolean
  /** Called when the drawer should be dismissed. */
  onClose: () => void
  /** Optional heading shown in the drawer header. */
  title?: string
  /** Drawer body content. */
  children: ReactNode
  /** Preferred origin side for the drawer. */
  side?: DrawerSide
  /** Additional class names applied to the panel. */
  className?: string
  /** Allows closing the drawer by clicking the backdrop. */
  closeOnBackdrop?: boolean
}

const sideClasses: Record<DrawerSide, { panel: string; enter: string; leave: string }> = {
  bottom: {
    panel: 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]',
    enter: 'translate-y-0',
    leave: 'translate-y-full',
  },
  right: {
    panel: 'top-0 right-0 bottom-0 w-full max-w-md',
    enter: 'translate-x-0',
    leave: 'translate-x-full',
  },
  left: {
    panel: 'top-0 left-0 bottom-0 w-full max-w-sm',
    enter: 'translate-x-0',
    leave: '-translate-x-full',
  },
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'bottom',
  className,
  closeOnBackdrop = true,
}: DrawerProps) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(min-width: 1024px)')
    const updateDesktop = (event?: MediaQueryListEvent) => {
      setIsDesktop(event?.matches ?? media.matches)
    }

    updateDesktop()
    media.addEventListener('change', updateDesktop)
    return () => media.removeEventListener('change', updateDesktop)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const effectiveSide = side === 'bottom' && isDesktop ? 'right' : side
  const { panel } = sideClasses[effectiveSide]

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {/* Panel */}
      <div
        className={clsx(
          'absolute bg-white shadow-dialog overflow-hidden flex flex-col animate-slide-up',
          panel,
          className
        )}
        >
        {/* Handle (bottom drawer) */}
        {effectiveSide === 'bottom' && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-divider" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-divider shrink-0">
            <h2 className="text-title-md text-on-surface">{title}</h2>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors"
              aria-label="Đóng"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  )
}
