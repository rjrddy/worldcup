'use client'

import { useLiveStatus } from './LiveProvider'

/**
 * Per-card overlay that renders a status pill + score inside a MatchCard
 * whenever live data exists for the match. Server-renders nothing so it
 * doesn't bloat the static HTML; hydrates after LiveProvider fetches.
 */
export function MatchCardLive({ matchId }: { matchId: string }) {
  const s = useLiveStatus(matchId)
  if (!s) return null
  const status = s.statusShort
  if (status === 'NS' || status === 'TBD') return null

  const isLive = ['1H', '2H', 'ET', 'BT', 'P'].includes(status)
  const label =
    status === 'HT'
      ? 'HT'
      : status === 'FT' || status === 'AET' || status === 'PEN'
      ? 'FT'
      : isLive
      ? `${s.elapsed ?? ''}${s.addedMinute ? `+${s.addedMinute}` : ''}'`
      : status

  const hasScore = s.scoreHome != null && s.scoreAway != null

  return (
    <span
      className={`match-card__live ${isLive ? 'is-live' : ''}`}
      aria-label={`Match status ${s.statusLong ?? status}`}
    >
      {hasScore && (
        <span className="match-card__live-score">
          {s.scoreHome}–{s.scoreAway}
        </span>
      )}
      <span className="match-card__live-pill">{label}</span>
    </span>
  )
}
