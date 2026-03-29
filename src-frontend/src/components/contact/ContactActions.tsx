// Path: src-frontend/src/components/contact/ContactActions.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dropdown } from '@/components/ui/Dropdown'
import { useContactMutations } from '@/hooks/useContactMutations'
import { ROUTES } from '@/constants/routes'
import type { ContactIndex } from '@/types/contact.types'

interface ContactActionsProps {
  contact: ContactIndex
  onDeleted?: () => void
}

export function ContactActions({ contact, onDeleted }: ContactActionsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const { remove } = useContactMutations()

  const handleDelete = () => {
    remove.mutate(contact.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        onDeleted?.()
      },
    })
  }

  const items = [
    {
      label: 'Chỉnh sửa',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round"/>
        </svg>
      ),
      onClick: () => navigate(ROUTES.contactEdit(contact.id)),
    },
    ...(contact.primaryEmail
      ? [{
          label: 'Gửi email',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round"/>
              <polyline points="22,6 12,13 2,6" />
            </svg>
          ),
          onClick: () => window.open(`mailto:${contact.primaryEmail}`),
        }]
      : []),
    ...(contact.primaryPhone
      ? [{
          label: 'Gọi điện',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.22 2 2 0 012 .04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" strokeLinecap="round"/>
            </svg>
          ),
          onClick: () => window.open(`tel:${contact.primaryPhone}`),
        }]
      : []),
    {
      label: 'Xóa',
      danger: true,
      divider: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round"/>
          <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
        </svg>
      ),
      onClick: () => setConfirmDelete(true),
    },
  ]

  return (
    <>
      <Dropdown
        trigger={
          <button
            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Tùy chọn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        }
        items={items}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Xóa liên hệ"
        message={`Bạn có chắc muốn xóa "${contact.displayName}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
      />
    </>
  )
}
