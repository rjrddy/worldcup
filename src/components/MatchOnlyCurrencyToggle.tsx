'use client'

import { usePathname } from 'next/navigation'
import { CurrencyToggle } from './CurrencyToggle'

/**
 * Renders the currency toggle ONLY on match detail pages (`/match/[matchId]`),
 * since salary is the only place currency matters. Hidden everywhere else
 * (home, profile, bracket, etc.) so the header stays uncluttered.
 */
export function MatchOnlyCurrencyToggle() {
  const pathname = usePathname()
  if (!pathname?.startsWith('/match/')) return null
  return <CurrencyToggle />
}
