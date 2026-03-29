// Path: src-frontend/src/components/contact/ContactListItem.tsx

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ContactAvatar } from './ContactAvatar'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ROUTES } from '@/constants/routes'
import { useContactMutations } from '@/hooks/useContactMutations'
import type { ContactIndex } from '@/types/contact.types'

interface ContactListItemProps {
  contact: ContactIndex
  isSelected?: boolean
  onClick?: () => void
}

const ACTION_WIDTH = 72

function isSwipeCapable() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

export function ContactListItem({ contact, isSelected = false, onClick }: ContactListItemProps) {
  const navigate = useNavigate()
  const { remove } = useContactMutations()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [offset, setOffset] = useState(0)
  const offsetRef = useRef(0)
  const suppressClickRef = useRef(false)
  const supportsSwipe = isSwipeCapable()
  const subtitle = contact.primaryEmail || contact.primaryPhone || contact.organization || ''
  const quickActions = useMemo(() => {
    const actions = [
      {
        label: 'Sửa',
        toneClass: 'bg-primary text-white',
        onClick: () => navigate(ROUTES.contactEdit(contact.id)),
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" />
          </svg>
        ),
      },
      ...(contact.primaryEmail
        ? [{
            label: 'Email',
            toneClass: 'bg-sky-500 text-white',
            onClick: () => { window.location.href = `mailto:${contact.primaryEmail}` },
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            ),
          }]
        : contact.primaryPhone
          ? [{
              label: 'Gọi',
              toneClass: 'bg-emerald-500 text-white',
              onClick: () => { window.location.href = `tel:${contact.primaryPhone}` },
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.22 2 2 0 012 .04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" strokeLinecap="round" />
                </svg>
              ),
            }]
          : []),
      {
        label: 'Xóa',
        toneClass: 'bg-error text-white',
        onClick: () => setConfirmDelete(true),
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" />
            <path d="M10 11v6M14 11v6" strokeLinecap="round" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
          </svg>
        ),
      },
    ]

    return actions
  }, [contact.id, contact.primaryEmail, contact.primaryPhone, navigate])
  const maxSwipe = supportsSwipe ? quickActions.length * ACTION_WIDTH : 0
  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    initialOffset: 0,
    isDragging: false,
    isHorizontal: null as boolean | null,
  })

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const closeSwipe = () => {
    setOffset(0)
    offsetRef.current = 0
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!supportsSwipe || quickActions.length === 0 || event.pointerType === 'mouse') return

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialOffset: offsetRef.current,
      isDragging: true,
      isHorizontal: null,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current
    if (!supportsSwipe || !drag.isDragging) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (drag.isHorizontal === null) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return
      drag.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
    }

    if (!drag.isHorizontal) return

    const nextOffset = Math.max(-maxSwipe, Math.min(0, drag.initialOffset + deltaX))
    if (Math.abs(nextOffset - drag.initialOffset) > 8) {
      suppressClickRef.current = true
    }

    setOffset(nextOffset)
    offsetRef.current = nextOffset
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current
    if (!drag.isDragging) return

    drag.isDragging = false
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId)
    }

    if (!drag.isHorizontal) return

    const nextOffset = offsetRef.current <= -maxSwipe / 2 ? -maxSwipe : 0
    setOffset(nextOffset)
    offsetRef.current = nextOffset
  }

  const handleRowClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (offsetRef.current !== 0) {
      closeSwipe()
      return
    }

    onClick?.()
  }

  return (
    <>
      <div className="relative overflow-hidden border-b border-divider/50 last:border-b-0">
        {supportsSwipe && quickActions.length > 0 && (
          <div className="absolute inset-y-0 right-0 flex lg:hidden">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={clsx(
                  'flex w-[72px] flex-col items-center justify-center gap-1 text-body-sm font-medium',
                  action.toneClass
                )}
                onClick={() => {
                  closeSwipe()
                  action.onClick()
                }}
                aria-label={action.label}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleRowClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={supportsSwipe ? { transform: `translateX(${offset}px)`, touchAction: 'pan-y' } : undefined}
          className={clsx(
            'relative z-10 flex w-full items-center gap-3 bg-white px-4 py-3 text-left',
            'transition-[background-color,transform] duration-150',
            'hover:bg-surface-container',
            supportsSwipe ? 'lg:transform-none' : '',
            isSelected ? 'bg-primary-50 hover:bg-primary-100' : ''
          )}
        >
          <ContactAvatar name={contact.displayName} photoUrl={contact.photoUrl} size="md" className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={clsx(
                  'truncate text-body-md font-medium',
                  isSelected ? 'text-primary' : 'text-on-surface'
                )}
              >
                {contact.displayName || 'Không tên'}
              </p>
              {supportsSwipe && quickActions.length > 0 && (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant lg:hidden">
                  Vuốt trái
                </span>
              )}
            </div>
            {subtitle && (
              <p className="truncate text-body-sm text-on-surface-variant">{subtitle}</p>
            )}
          </div>

          {contact.hasUserDefined && (
            <span className="shrink-0" title={`${contact.udKeyCount} userDefined keys`}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-on-surface-variant/50"
              >
                <path
                  d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}

          {contact.categories.length > 0 && (
            <div className="hidden shrink-0 gap-1 sm:flex">
              {contact.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="default" size="sm">{cat}</Badge>
              ))}
            </div>
          )}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          remove.mutate(contact.id, {
            onSuccess: () => {
              setConfirmDelete(false)
              closeSwipe()
            },
          })
        }}
        title="Xóa liên hệ"
        message={`Bạn có chắc muốn xóa "${contact.displayName}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
      />
    </>
  )
}
