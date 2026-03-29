// Path: src-frontend/src/components/layout/FloatingActionButton.tsx

import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { clsx } from 'clsx'

interface FloatingActionButtonProps {
  className?: string
}

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(ROUTES.contactNew)}
      aria-label="Tạo liên hệ mới"
      className={clsx(
        'fixed bottom-20 right-4 z-30',
        'flex h-14 w-14 items-center justify-center',
        'rounded-full bg-primary text-white shadow-fab',
        'transition-all duration-200 hover:bg-primary-600 hover:scale-105 active:scale-95',
        'lg:hidden',
        className
      )}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  )
}
