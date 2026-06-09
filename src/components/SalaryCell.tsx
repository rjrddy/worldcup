'use client'

import { formatInCurrency } from '@/lib/currency'
import { useCurrency } from './CurrencyProvider'

interface Props {
  annualEur?: number
  source?: string
  isMarketValue?: boolean
}

export function SalaryCell({ annualEur, source, isMarketValue }: Props) {
  const { currency } = useCurrency()

  if (!annualEur || annualEur <= 0) {
    return <span className="player-card__empty">—</span>
  }

  const label = isMarketValue ? 'Market value' : 'Salary / yr'
  const title = `${label} · ${source ?? 'estimate'} (shown in ${currency})`

  return (
    <span title={title} suppressHydrationWarning>
      {formatInCurrency(annualEur, currency)}
    </span>
  )
}
