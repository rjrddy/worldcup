export function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}'${inches}"`
}

export function formatSalary(annual: number, currency: string): string {
  const m = annual / 1_000_000
  return `${currency} ${m.toFixed(1)}M`
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
