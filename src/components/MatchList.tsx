import type { Match } from '@/lib/types'
import { MatchCard } from './MatchCard'

interface MatchListProps {
  matches: Match[]
}

/** Sort matches chronologically by kickoff, then bucket by calendar day. */
function bucketByDay(matches: Match[]): Array<{ key: string; label: string; matches: Match[] }> {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
  )
  const buckets = new Map<string, Match[]>()
  for (const m of sorted) {
    const d = new Date(m.kickoff)
    // Local day key (YYYY-MM-DD)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(m)
  }

  const labelFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return Array.from(buckets.entries()).map(([key, ms]) => {
    const d = new Date(ms[0].kickoff)
    return { key, label: labelFmt.format(d), matches: ms }
  })
}

export function MatchList({ matches }: MatchListProps) {
  const buckets = bucketByDay(matches)

  return (
    <div className="match-list">
      {buckets.map((b, i) => (
        <section
          key={b.key}
          className="match-list__day"
          aria-labelledby={`day-${b.key}-heading`}
        >
          <header className="match-list__day-header">
            <h2 id={`day-${b.key}-heading`} className="match-list__day-title">
              {b.label}
            </h2>
            <span className="match-list__day-count">
              {b.matches.length}{' '}
              {b.matches.length === 1 ? 'match' : 'matches'}
            </span>
            {i === 0 && (
              <span className="match-list__day-chip" aria-hidden="true">
                Opening day
              </span>
            )}
          </header>
          <ol className="match-list__cards" role="list">
            {b.matches.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
