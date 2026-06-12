'use client'

import { useEffect, useState } from 'react'
import type { LiveStatus, MatchEvent } from '@/lib/types'

interface Props {
  matchId: string
  homeName: string
  awayName: string
  /** Used to label which side each event belongs to. */
  homeTeamId: string
  awayTeamId: string
  /** Server-side seed so the page isn't blank before the first poll. */
  initialStatus?: LiveStatus | null
  initialEvents?: MatchEvent[]
}

interface LiveBundle {
  status: LiveStatus | null
  events: MatchEvent[]
}

/**
 * Live view inside a match detail page.
 *
 * - Renders a score/status header once a match is in progress or finished
 * - Renders an events timeline (goals, cards, lineups-announced)
 * - Polls /api/match/<id>/live every 30s while match is "live-ish"
 * - Falls silent (renders nothing visible) for matches that haven't started
 */
export function MatchLiveView({
  matchId,
  homeName,
  awayName,
  homeTeamId,
  awayTeamId,
  initialStatus = null,
  initialEvents = [],
}: Props) {
  const [data, setData] = useState<LiveBundle>({
    status: initialStatus,
    events: initialEvents,
  })

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const res = await fetch(`/api/match/${matchId}/live`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as LiveBundle
        if (!cancelled) setData(json)
      } catch {
        /* keep last good state */
      }
    }
    tick()

    const status = data.status?.statusShort
    const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(status ?? '')
    const interval = isLive ? 30_000 : 90_000
    const id = setInterval(tick, interval)
    return () => {
      cancelled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, data.status?.statusShort])

  const status = data.status
  const events = data.events
  const statusShort = status?.statusShort ?? 'NS'
  const isPreMatch = statusShort === 'NS' || statusShort === 'TBD' || !status
  const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(statusShort)
  const isFinished = ['FT', 'AET', 'PEN'].includes(statusShort)
  const showHeader = !isPreMatch
  const hasAnyEvents = events.length > 0

  return (
    <>
      {showHeader && (
        <section className="live-header" aria-label="Live match status">
          <div className="live-header__inner">
            <div className="live-header__status">
              {isLive ? (
                <>
                  <span className="live-header__dot" aria-hidden="true" />
                  <span className="live-header__minute">
                    {statusShort === 'HT'
                      ? 'Half time'
                      : `${status?.elapsed ?? ''}${
                          status?.addedMinute
                            ? `+${status.addedMinute}`
                            : ''
                        }'`}
                  </span>
                </>
              ) : (
                <span className="live-header__minute">
                  {statusShort === 'FT'
                    ? 'Full time'
                    : statusShort === 'AET'
                    ? 'After extra time'
                    : statusShort === 'PEN'
                    ? 'Penalty shootout'
                    : statusShort}
                </span>
              )}
            </div>
            <div className="live-header__score">
              <span className="live-header__team">{homeName}</span>
              <span className="live-header__digits">
                {status?.scoreHome ?? 0}
                <span className="live-header__dash">–</span>
                {status?.scoreAway ?? 0}
              </span>
              <span className="live-header__team">{awayName}</span>
            </div>
            {status?.htHome != null && status?.htAway != null && isFinished && (
              <div className="live-header__ht">
                HT {status.htHome}–{status.htAway}
              </div>
            )}
          </div>
        </section>
      )}

      {(showHeader || hasAnyEvents || status?.hasLineups) && (
        <section className="events-timeline" aria-labelledby="events-heading">
          <h2 id="events-heading" className="events-timeline__title">
            Timeline
          </h2>

          {!hasAnyEvents && status?.hasLineups && (
            <div className="events-timeline__lineups-announced">
              ✓ Starting XI announced
            </div>
          )}

          {hasAnyEvents && (
            <ol className="events-timeline__list" role="list">
              {events.map((e, i) => {
                const sideClass =
                  e.teamId === homeTeamId
                    ? 'is-home'
                    : e.teamId === awayTeamId
                    ? 'is-away'
                    : ''
                const minuteLabel = `${e.minute}${
                  e.addedMinute ? `+${e.addedMinute}` : ''
                }'`
                return (
                  <li
                    key={`${e.minute}-${e.type}-${e.playerId ?? i}-${i}`}
                    className={`event-row ${sideClass}`}
                  >
                    <span className="event-row__minute">{minuteLabel}</span>
                    <span
                      className={`event-row__icon event-row__icon--${eventClass(
                        e
                      )}`}
                      aria-hidden="true"
                    >
                      {eventIcon(e)}
                    </span>
                    <div className="event-row__body">
                      <div className="event-row__player">
                        {e.playerName ?? e.detail ?? e.type}
                      </div>
                      <div className="event-row__detail">
                        {e.detail}
                        {e.assistName ? ` · assist ${e.assistName}` : ''}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      )}
    </>
  )
}

function eventClass(e: MatchEvent): string {
  if (e.type === 'Goal') return 'goal'
  if (e.type === 'Card') {
    if ((e.detail ?? '').toLowerCase().includes('red')) return 'red'
    return 'yellow'
  }
  if (e.type === 'subst') return 'sub'
  if (e.type === 'Var') return 'var'
  if (e.type === 'Lineup') return 'lineup'
  return 'other'
}

function eventIcon(e: MatchEvent): string {
  if (e.type === 'Goal') return '⚽'
  if (e.type === 'Card') {
    if ((e.detail ?? '').toLowerCase().includes('red')) return '🟥'
    return '🟨'
  }
  if (e.type === 'subst') return '↔'
  if (e.type === 'Var') return 'VAR'
  return '•'
}
