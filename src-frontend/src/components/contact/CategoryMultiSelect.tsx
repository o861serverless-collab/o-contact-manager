import { clsx } from 'clsx'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { CategorySummary } from '@/types/contact.types'

interface CategoryMultiSelectProps {
  label?: string
  value: string[]
  suggestions?: CategorySummary[]
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  className?: string
  onChange: (nextValue: string[]) => void
  onBlur?: () => void
}

type CategoryOption =
  | { type: 'existing'; value: string; label: string; meta?: string }
  | { type: 'create'; value: string; label: string }

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function CategoryMultiSelect({
  label = 'Nhóm',
  value,
  suggestions = [],
  placeholder = 'Tìm hoặc tạo nhóm mới',
  hint,
  error,
  disabled = false,
  className,
  onChange,
  onBlur,
}: CategoryMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedSet = useMemo(
    () => new Set(value.map((item) => normalizeCategory(item).toLowerCase())),
    [value]
  )
  const normalizedQuery = normalizeCategory(query)

  const options = useMemo<CategoryOption[]>(() => {
    const lowerQuery = normalizedQuery.toLowerCase()
    const existing = suggestions
      .filter((category) => !selectedSet.has(category.name.toLowerCase()))
      .filter((category) => {
        if (!lowerQuery) return true
        return category.name.toLowerCase().includes(lowerQuery) || category.label.toLowerCase().includes(lowerQuery)
      })
      .slice(0, 6)
      .map((category) => ({
        type: 'existing' as const,
        value: category.name,
        label: category.label,
        meta: `${category.count} liên hệ`,
      }))

    const hasExactMatch = suggestions.some((category) => category.name.toLowerCase() === lowerQuery)
    const canCreate = normalizedQuery.length > 0 && !selectedSet.has(lowerQuery) && !hasExactMatch

    return canCreate
      ? [...existing, { type: 'create', value: normalizedQuery, label: `Tạo nhóm "${normalizedQuery}"` }]
      : existing
  }, [normalizedQuery, selectedSet, suggestions])

  useEffect(() => {
    if (!open) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((index) => Math.min(index, Math.max(options.length - 1, 0)))
  }, [open, options.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const commitCategory = (rawValue: string) => {
    const nextCategory = normalizeCategory(rawValue)
    if (!nextCategory) return false

    const normalized = nextCategory.toLowerCase()
    if (selectedSet.has(normalized)) {
      setQuery('')
      setOpen(false)
      return false
    }

    onChange([...value, nextCategory])
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
    return true
  }

  const removeCategory = (item: string) => {
    onChange(value.filter((category) => category !== item))
    inputRef.current?.focus()
  }

  const handleOptionSelect = (option: CategoryOption) => {
    commitCategory(option.type === 'create' ? option.value : option.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if ((event.key === 'Enter' || event.key === ',') && (normalizedQuery || options[activeIndex])) {
      event.preventDefault()
      const activeOption = options[activeIndex]
      if (open && activeOption) {
        handleOptionSelect(activeOption)
        return
      }
      commitCategory(query)
      return
    }

    if (event.key === 'Backspace' && !query && value.length > 0) {
      event.preventDefault()
      removeCategory(value[value.length - 1])
      return
    }

    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % options.length)
      return
    }

    if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + options.length) % options.length)
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label className="text-label text-on-surface font-medium">{label}</label>
      <div ref={rootRef} className="relative">
        <div
          className={clsx(
            'flex min-h-11 flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2',
            'transition-colors duration-150',
            'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-300',
            disabled ? 'cursor-not-allowed bg-surface-container opacity-60' : '',
            error ? 'border-error focus-within:border-error focus-within:ring-error/30' : 'border-divider',
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-body-sm font-medium text-primary-700"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  removeCategory(item)
                }}
                className="rounded-full p-0.5 text-primary-600 transition-colors hover:bg-primary-100 hover:text-primary-700"
                aria-label={`Xóa nhóm ${item}`}
                disabled={disabled}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            placeholder={value.length === 0 ? placeholder : 'Thêm nhóm'}
            className="min-w-[10rem] flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
            onFocus={() => setOpen(true)}
            onBlur={onBlur}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onKeyDown={handleKeyDown}
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
          />
        </div>

        {open && options.length > 0 && !disabled && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-divider bg-white shadow-card-hover"
          >
            {options.map((option, index) => (
              <button
                key={`${option.type}-${option.value}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-body-md transition-colors',
                  index === activeIndex ? 'bg-primary-50 text-primary-700' : 'text-on-surface hover:bg-surface-container'
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOptionSelect(option)}
              >
                <span>{option.label}</span>
                {'meta' in option && option.meta ? (
                  <span className="text-body-sm text-on-surface-variant">{option.meta}</span>
                ) : (
                  <span className="text-body-sm text-on-surface-variant">Mới</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-body-sm text-error">{error}</p>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          {hint ?? 'Nhấn Enter hoặc dấu phẩy để thêm nhóm mới'}
        </p>
      )}
    </div>
  )
}
