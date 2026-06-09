'use client'

import { CURRENCIES, type Currency } from '@/lib/currency'
import { useCurrency } from './CurrencyProvider'

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="currency-toggle" role="group" aria-label="Display currency">
      <span className="currency-toggle__label" aria-hidden="true">
        Currency
      </span>
      <div className="currency-toggle__track">
        {CURRENCIES.map((c: Currency) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={currency === c}
            className={`currency-toggle__btn ${
              currency === c ? 'is-active' : ''
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
