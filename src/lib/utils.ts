export function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}'${inches}"`
}

export function formatSalary(annual: number, currency: string): string {
  const m = annual / 1_000_000
  const symbol =
    currency === 'EUR' ? '€' :
    currency === 'USD' ? '$' :
    currency === 'GBP' ? '£' :
    `${currency} `
  // Whole numbers for values ≥ €10M (tighter), one decimal below
  const formatted =
    m >= 10 ? Math.round(m).toString() : m >= 1 ? m.toFixed(1) : m.toFixed(2)
  return `${symbol}${formatted}M`
}

export function formatKickoff(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function formatKickoffDate(iso: string): {
  weekday: string
  month: string
  day: string
  time: string
  tz: string
} {
  const d = new Date(iso)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    tz:
      d
        .toLocaleTimeString('en-US', { timeZoneName: 'short' })
        .split(' ')
        .pop() ?? '',
  }
}

export function groupMatchesByGroup(
  matches: import('./types').Match[]
): Record<string, import('./types').Match[]> {
  return matches.reduce<Record<string, import('./types').Match[]>>((acc, m) => {
    const key = m.group ?? 'KO'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
}
