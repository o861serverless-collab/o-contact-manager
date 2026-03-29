// Path: src-frontend/src/components/ui/Button.tsx

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/**
 * Props accepted by the shared button primitive.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant for the button. */
  variant?: Variant
  /** Size token controlling height and spacing. */
  size?: Size
  /** Replaces content with a spinner and disables interaction. */
  loading?: boolean
  /** Optional icon rendered next to the button label. */
  icon?: ReactNode
  /** Controls whether the icon appears before or after the label. */
  iconPosition?: 'left' | 'right'
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-300',
  secondary:
    'bg-white text-on-surface border border-divider hover:bg-surface-container active:bg-surface-variant focus-visible:ring-primary-200',
  ghost:
    'bg-transparent text-primary hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-200',
  danger:
    'bg-error text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-300',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm gap-1.5',
  md: 'h-9 px-4 text-body-md gap-2',
  lg: 'h-11 px-6 text-body-lg gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" />
        ) : (
          iconPosition === 'left' && icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconPosition === 'right' && icon && (
          <span className="shrink-0">{icon}</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
