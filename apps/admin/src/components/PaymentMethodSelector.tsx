'use client'

import type { ReactNode } from 'react'
import type { PaymentMethod } from '@novafit/types'

export function PaymentMethodIcon({ methodKey }: { methodKey: string }) {
  switch (methodKey) {
    case 'cash':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      )
    case 'card':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      )
    case 'bank_transfer':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" x2="21" y1="22" y2="22" />
          <line x1="6" x2="6" y1="18" y2="11" />
          <line x1="10" x2="10" y1="18" y2="11" />
          <line x1="14" x2="14" y1="18" y2="11" />
          <line x1="18" x2="18" y1="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        </svg>
      )
    case 'tigo_money':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
          <path d="M10 8h4" />
          <path d="M12 6v6" />
        </svg>
      )
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>
      )
  }
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedId,
  onSelect,
  customValue = '',
  onCustomChange,
  label = 'Método de pago',
  required = false,
  headerRight,
}: {
  paymentMethods: PaymentMethod[]
  selectedId: string
  onSelect: (id: string) => void
  customValue?: string
  onCustomChange?: (value: string) => void
  label?: string
  required?: boolean
  headerRight?: ReactNode
}) {
  const selectedMethod = paymentMethods.find((pm) => pm.id === selectedId)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label} {required && <span className="text-error">*</span>}
        </span>
        {headerRight}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {paymentMethods.map((pm) => {
          const isSelected = selectedId === pm.id
          return (
            <button
              key={pm.id}
              type="button"
              onClick={() => onSelect(pm.id)}
              aria-pressed={isSelected}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-accent/20 border-accent text-white shadow-md shadow-accent/20'
                  : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-white/25'
              }`}
            >
              <div className={isSelected ? 'text-accent' : 'text-muted-foreground'}>
                <PaymentMethodIcon methodKey={pm.key} />
              </div>
              <span className="text-[11px] font-bold leading-tight">{pm.name}</span>
            </button>
          )
        })}
      </div>

      {selectedMethod?.key === 'other' && onCustomChange && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Especifica el método de pago..."
          className="input !min-h-10 text-sm mt-1"
        />
      )}
    </div>
  )
}

