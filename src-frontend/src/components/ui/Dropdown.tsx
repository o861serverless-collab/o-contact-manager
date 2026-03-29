// Path: src-frontend/src/components/ui/Dropdown.tsx

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'

/**
 * Describes a single actionable row inside the dropdown menu.
 */
export interface DropdownItem {
  /** Human-readable label rendered in the menu row. */
  label: string
  /** Optional leading icon. */
  icon?: ReactNode
  /** Callback fired when the item is selected. */
  onClick: () => void
  /** Prevents selection and keyboard activation. */
  disabled?: boolean
  /** Applies destructive styling for critical actions. */
  danger?: boolean
  /** Renders a divider before the item when true. */
  divider?: boolean
}

/**
 * Props for the dropdown menu trigger and flyout.
 */
interface DropdownProps {
  /** Element used to open the dropdown. */
  trigger: ReactNode
  /** Menu items rendered inside the dropdown. */
  items: DropdownItem[]
  /** Horizontal alignment of the menu relative to the trigger. */
  align?: 'left' | 'right'
  /** Additional class names applied to the trigger wrapper. */
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [activeIndex, setActiveIndex] = useState(-1)
  const menuId = useId()
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const getEnabledIndices = useCallback(() =>
    items
      .map((item, index) => item.disabled ? -1 : index)
      .filter((index) => index >= 0),
  [items])

  const focusItem = (index: number) => {
    const node = menuRef.current?.querySelector<HTMLButtonElement>(`[data-menu-index="${index}"]`)
    node?.focus()
  }

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const targetLeft = align === 'right'
      ? rect.right + window.scrollX - 180
      : rect.left + window.scrollX

    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(12, Math.min(targetLeft, window.innerWidth + window.scrollX - 192)),
    })
  }, [align])

  const closeMenu = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  const openMenu = useCallback((focus: 'first' | 'last' = 'first') => {
    updatePosition()
    const enabled = getEnabledIndices()
    setOpen(true)
    setActiveIndex(enabled.length === 0 ? -1 : focus === 'last' ? enabled[enabled.length - 1] : enabled[0])
  }, [getEnabledIndices, updatePosition])

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu()
      }
    }

    const handleKey = (e: globalThis.KeyboardEvent) => {
      const enabled = getEnabledIndices()

      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
        triggerRef.current?.focus()
        return
      }

      if (e.key === 'Tab') {
        closeMenu()
        return
      }

      if (!enabled.length) return

      const current = activeIndex >= 0 ? enabled.indexOf(activeIndex) : -1

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = enabled[(current + 1 + enabled.length) % enabled.length]
        setActiveIndex(next)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = enabled[(current - 1 + enabled.length) % enabled.length]
        setActiveIndex(next)
        return
      }

      if (e.key === 'Home') {
        e.preventDefault()
        setActiveIndex(enabled[0])
        return
      }

      if (e.key === 'End') {
        e.preventDefault()
        setActiveIndex(enabled[enabled.length - 1])
        return
      }

      if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0) {
        e.preventDefault()
        items[activeIndex]?.onClick()
        closeMenu()
      }
    }

    const handleResize = () => updatePosition()

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [activeIndex, closeMenu, getEnabledIndices, items, open, updatePosition])

  useEffect(() => {
    if (open && activeIndex >= 0) {
      focusItem(activeIndex)
    }
  }, [activeIndex, open])

  const handleToggle = () => {
    if (open) {
      closeMenu()
      return
    }
    openMenu('first')
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenu('first')
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu('last')
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        className={clsx('inline-flex', className)}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {trigger}
      </div>
      {open && createPortal(
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-44 rounded-xl bg-white shadow-card-hover border border-divider py-1 animate-scale-in origin-top-right"
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && i > 0 && <div className="my-1 border-t border-divider" />}
              <button
                role="menuitem"
                data-menu-index={i}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick()
                  closeMenu()
                }}
                tabIndex={activeIndex === i ? 0 : -1}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-body-md text-left',
                  'transition-colors duration-100',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  activeIndex === i && !item.disabled ? 'bg-surface-container' : '',
                  item.danger
                    ? 'text-error hover:bg-red-50'
                    : 'text-on-surface hover:bg-surface-container'
                )}
              >
                {item.icon && <span className="text-on-surface-variant shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
