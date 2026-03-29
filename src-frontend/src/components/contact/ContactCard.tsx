// Path: src-frontend/src/components/contact/ContactCard.tsx

import { clsx } from 'clsx'
import { ContactAvatar } from './ContactAvatar'
import type { ContactIndex } from '@/types/contact.types'

interface ContactCardProps {
  contact: ContactIndex
  isSelected?: boolean
  onClick?: () => void
}

export function ContactCard({ contact, isSelected = false, onClick }: ContactCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-2 p-4 rounded-xl text-center',
        'transition-all duration-150 hover:shadow-card-hover',
        isSelected
          ? 'bg-primary-50 ring-2 ring-primary shadow-card'
          : 'bg-white shadow-card hover:bg-surface-container'
      )}
    >
      <ContactAvatar name={contact.displayName} photoUrl={contact.photoUrl} size="lg" />
      <div className="min-w-0 w-full">
        <p className={clsx(
          'text-body-md font-medium truncate',
          isSelected ? 'text-primary' : 'text-on-surface'
        )}>
          {contact.displayName || 'Không tên'}
        </p>
        {contact.primaryEmail && (
          <p className="text-body-sm text-on-surface-variant truncate">{contact.primaryEmail}</p>
        )}
        {contact.organization && !contact.primaryEmail && (
          <p className="text-body-sm text-on-surface-variant truncate">{contact.organization}</p>
        )}
      </div>
    </button>
  )
}
