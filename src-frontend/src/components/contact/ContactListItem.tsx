// Path: src-frontend/src/components/contact/ContactListItem.tsx

import { clsx } from 'clsx'
import { ContactAvatar } from './ContactAvatar'
import { Badge } from '@/components/ui/Badge'
import type { ContactIndex } from '@/types/contact.types'

interface ContactListItemProps {
  contact: ContactIndex
  isSelected?: boolean
  onClick?: () => void
}

export function ContactListItem({ contact, isSelected = false, onClick }: ContactListItemProps) {
  const subtitle = contact.primaryEmail || contact.primaryPhone || contact.organization || ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 px-4 py-3 text-left',
        'transition-colors duration-100',
        'hover:bg-surface-container',
        isSelected ? 'bg-primary-50 hover:bg-primary-100' : ''
      )}
    >
      <ContactAvatar name={contact.displayName} photoUrl={contact.photoUrl} size="md" className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className={clsx(
          'truncate text-body-md font-medium',
          isSelected ? 'text-primary' : 'text-on-surface'
        )}>
          {contact.displayName || 'Không tên'}
        </p>
        {subtitle && (
          <p className="truncate text-body-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>

      {contact.hasUserDefined && (
        <span className="shrink-0" title={`${contact.udKeyCount} userDefined keys`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-surface-variant/50">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeLinecap="round"/>
          </svg>
        </span>
      )}

      {contact.categories.length > 0 && (
        <div className="hidden sm:flex shrink-0 gap-1">
          {contact.categories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="default" size="sm">{cat}</Badge>
          ))}
        </div>
      )}
    </button>
  )
}
