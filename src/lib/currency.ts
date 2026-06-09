export type Currency = 'EUR' | 'USD' | 'GBP'

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP']

/**
 * Static EUR → X conversion rates (approximate, June 2026).
 * If you want exact rates, swap this for a build-time fetch from an FX API.
 */
export const RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
}

export const SYMBOL: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

/** Format an EUR amount in the target currency. */
export function formatInCurrency(annualEur: number, currency: Currency): string {
  const amount = annualEur * RATES[currency]
  const m = amount / 1_000_000
  const value =
    m >= 10 ? Math.round(m).toString() : m >= 1 ? m.toFixed(1) : m.toFixed(2)
  return `${SYMBOL[currency]}${value}M`
}
