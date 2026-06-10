'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CountryFlag } from '@/components/CountryFlag'
import {
  BRACKET_TEMPLATE,
  GROUP_LETTERS,
  N_BEST_THIRDS,
  POSITIONS,
  bracketCanStart,
  resolveSlot,
  type GroupPicks,
  type KoPicks,
  type MatchSlot,
  type SlotRef,
} from '@/lib/bracket'
import { SortableGroupCard } from './SortableGroupCard'

interface Team {
  id: string
  name: string
  countryCode: string
}

interface Group {
  letter: string
  teams: Team[]
}

interface Props {
  userId: string
  groups: Group[]
  initialGroupPicks: GroupPicks
  initialKoPicks: KoPicks
}

export function BracketEditor({
  userId,
  groups,
  initialGroupPicks,
  initialKoPicks,
}: Props) {
  const supabase = createClient()
  const [groupPicks, setGroupPicks] = useState<GroupPicks>(
    initialGroupPicks ?? {}
  )
  const [koPicks, setKoPicks] = useState<KoPicks>(initialKoPicks ?? {})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Flat lookup: teamId -> team object (across all groups)
  const teamById = new Map<string, Team>()
  for (const g of groups) for (const t of g.teams) teamById.set(t.id, t)

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void save(groupPicks, koPicks)
    }, 600)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupPicks, koPicks])

  async function save(g: GroupPicks, k: KoPicks) {
    if (!supabase) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('brackets')
      .upsert(
        { user_id: userId, group_picks: g, ko_picks: k },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    if (error) setError(error.message)
    else setSavedAt(new Date())
  }

  // ── Group ordering (drag-to-rank) ────────────────────────
  function setGroupOrder(letter: string, orderedTeamIds: string[]) {
    setGroupPicks((prev) => ({
      ...prev,
      [letter]: {
        first: orderedTeamIds[0],
        second: orderedTeamIds[1],
        third: orderedTeamIds[2],
        fourth: orderedTeamIds[3],
      },
    }))
  }

  // ── Best 3rds handler ────────────────────────────────────
  function toggleBestThird(letter: string) {
    setKoPicks((prev) => {
      const current = prev.bestThirds ?? []
      const idx = current.indexOf(letter)
      let next: string[]
      if (idx >= 0) next = current.filter((l) => l !== letter)
      else {
        if (current.length >= N_BEST_THIRDS) return prev
        next = [...current, letter]
      }
      return { ...prev, bestThirds: next }
    })
  }

  // ── KO winner picker ─────────────────────────────────────
  function pickWinner(matchId: string, teamId: string) {
    setKoPicks((prev) => {
      const winners = { ...(prev.winners ?? {}) }
      if (winners[matchId] === teamId) delete winners[matchId]
      else winners[matchId] = teamId
      clearDownstreamWinners(matchId, winners)
      return { ...prev, winners }
    })
  }

  function clearDownstreamWinners(
    sourceMatchId: string,
    winners: Record<string, string>
  ) {
    for (const m of BRACKET_TEMPLATE) {
      const refsTouch = (ref: SlotRef) =>
        ref.kind === 'winner' && ref.matchId === sourceMatchId
      if ((refsTouch(m.home) || refsTouch(m.away)) && winners[m.id]) {
        delete winners[m.id]
        clearDownstreamWinners(m.id, winners)
      }
    }
  }

  // ── Derived state ────────────────────────────────────────
  const completedGroups = groups.filter((g) =>
    POSITIONS.every((p) => groupPicks[g.letter]?.[p])
  ).length

  const canStartKO = bracketCanStart(groupPicks, koPicks)
  const championId = koPicks.winners?.['final']
  const champion = championId ? teamById.get(championId) : null
  const koPicksMade = Object.keys(koPicks.winners ?? {}).length

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <div className="bracket-status" role="status" aria-live="polite">
        <span className="bracket-status__progress">
          <strong>{completedGroups}</strong>
          <span> / {groups.length} groups</span>
          <span aria-hidden="true"> · </span>
          <strong>{koPicks.bestThirds?.length ?? 0}</strong>
          <span> / {N_BEST_THIRDS} wildcards</span>
          <span aria-hidden="true"> · </span>
          <strong>{koPicksMade}</strong>
          <span> / 31 KO picks</span>
        </span>
        <span className="bracket-status__save">
          {saving
            ? 'Saving…'
            : error
            ? `⚠ ${error}`
            : savedAt
            ? `Saved ${savedAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Auto-saves as you pick'}
        </span>
      </div>

      {/* Group stage */}
      <section aria-labelledby="groups-section-title">
        <h2 id="groups-section-title" className="bracket-section-title">
          Group stage
        </h2>
        <p className="bracket-section-sub">
          Predict each group&rsquo;s full finishing order — drag teams up or
          down to rank them 1st through 4th.
        </p>
        <div className="bracket-groups">
          {groups.map((g) => (
            <SortableGroupCard
              key={g.letter}
              group={g}
              picks={groupPicks[g.letter] ?? {}}
              onReorder={(order) => setGroupOrder(g.letter, order)}
            />
          ))}
        </div>
      </section>

      {/* Best-3rds wildcards */}
      <section aria-labelledby="wildcards-section-title">
        <h2 id="wildcards-section-title" className="bracket-section-title">
          Wildcard slots
        </h2>
        <p className="bracket-section-sub">
          Eight of the twelve 3rd-placed teams advance to the Round of 32.
          Pick the eight you think make it.
        </p>
        <div className="bracket-wildcards">
          {GROUP_LETTERS.map((letter) => {
            const idx = koPicks.bestThirds?.indexOf(letter) ?? -1
            const isPicked = idx >= 0
            const thirdId = groupPicks[letter]?.third
            const team = thirdId ? teamById.get(thirdId) : null
            const disabledNoPick = !team
            const disabledFull =
              !isPicked &&
              (koPicks.bestThirds?.length ?? 0) >= N_BEST_THIRDS

            return (
              <button
                key={letter}
                type="button"
                className={`bracket-wildcard ${isPicked ? 'is-picked' : ''}`}
                onClick={() => toggleBestThird(letter)}
                disabled={disabledNoPick || disabledFull}
                aria-pressed={isPicked}
                title={
                  disabledNoPick
                    ? `Pick a 3rd in group ${letter} first`
                    : disabledFull
                    ? `${N_BEST_THIRDS} wildcards already selected`
                    : undefined
                }
              >
                <span className="bracket-wildcard__letter">{letter}</span>
                <span className="bracket-wildcard__divider" aria-hidden="true">3rd</span>
                <span className="bracket-wildcard__team">
                  {team ? (
                    <>
                      <CountryFlag
                        countryCode={team.countryCode}
                        countryName={team.name}
                        size="sm"
                      />
                      <span>{team.name}</span>
                    </>
                  ) : (
                    <span className="bracket-wildcard__empty">
                      — pick group {letter} 3rd —
                    </span>
                  )}
                </span>
                {isPicked && (
                  <span className="bracket-wildcard__rank" aria-hidden="true">
                    #{idx + 1}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* KO bracket */}
      <section aria-labelledby="ko-section-title">
        <h2 id="ko-section-title" className="bracket-section-title">
          Knockout bracket
        </h2>
        {!canStartKO ? (
          <div className="bracket-ko-locked">
            <p className="bracket-ko-locked__title">Bracket locks once…</p>
            <ul className="bracket-ko-locked__list">
              <li className={completedGroups === groups.length ? 'is-done' : ''}>
                {completedGroups === groups.length ? '✓' : '○'} All 12 groups
                are fully ordered (1st-4th) ({completedGroups}/12)
              </li>
              <li className={(koPicks.bestThirds?.length ?? 0) === N_BEST_THIRDS ? 'is-done' : ''}>
                {(koPicks.bestThirds?.length ?? 0) === N_BEST_THIRDS ? '✓' : '○'}{' '}
                {N_BEST_THIRDS} wildcards picked (
                {koPicks.bestThirds?.length ?? 0}/{N_BEST_THIRDS})
              </li>
            </ul>
          </div>
        ) : (
          <KoBracket
            template={BRACKET_TEMPLATE}
            groupPicks={groupPicks}
            koPicks={koPicks}
            teamById={teamById}
            onPickWinner={pickWinner}
          />
        )}
      </section>

      {champion && (
        <section className="bracket-champion" aria-label="Predicted champion">
          <p className="bracket-champion__eyebrow">Your champion</p>
          <CountryFlag
            countryCode={champion.countryCode}
            countryName={champion.name}
            size="lg"
          />
          <h2 className="bracket-champion__name">{champion.name}</h2>
        </section>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────
// KoBracket — 5 rounds, scroll-snap on phone
// ──────────────────────────────────────────────────────────
function KoBracket({
  template,
  groupPicks,
  koPicks,
  teamById,
  onPickWinner,
}: {
  template: MatchSlot[]
  groupPicks: GroupPicks
  koPicks: KoPicks
  teamById: Map<string, Team>
  onPickWinner: (matchId: string, teamId: string) => void
}) {
  const rounds = [
    { round: 'r32', label: 'Round of 32' },
    { round: 'r16', label: 'Round of 16' },
    { round: 'qf', label: 'Quarter-finals' },
    { round: 'sf', label: 'Semi-finals' },
    { round: 'final', label: 'Final' },
  ] as const

  return (
    <div className="ko-bracket" role="region" aria-label="Knockout bracket">
      {rounds.map(({ round, label }) => (
        <div key={round} className={`ko-round ko-round--${round}`}>
          <h3 className="ko-round__title">{label}</h3>
          <div className="ko-round__matches">
            {template
              .filter((m) => m.round === round)
              .map((m) => (
                <KoMatch
                  key={m.id}
                  match={m}
                  groupPicks={groupPicks}
                  koPicks={koPicks}
                  teamById={teamById}
                  onPickWinner={onPickWinner}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KoMatch({
  match,
  groupPicks,
  koPicks,
  teamById,
  onPickWinner,
}: {
  match: MatchSlot
  groupPicks: GroupPicks
  koPicks: KoPicks
  teamById: Map<string, Team>
  onPickWinner: (matchId: string, teamId: string) => void
}) {
  const homeId = resolveSlot(match.home, groupPicks, koPicks)
  const awayId = resolveSlot(match.away, groupPicks, koPicks)
  const winnerId = koPicks.winners?.[match.id]
  const home = homeId ? teamById.get(homeId) : null
  const away = awayId ? teamById.get(awayId) : null

  return (
    <div className="ko-match" data-round={match.round}>
      <div className="ko-match__label" aria-hidden="true">{match.label}</div>
      <KoSlot
        team={home}
        placeholder={describeSlot(match.home)}
        isWinner={!!homeId && winnerId === homeId}
        disabled={!homeId}
        onClick={() => homeId && onPickWinner(match.id, homeId)}
      />
      <KoSlot
        team={away}
        placeholder={describeSlot(match.away)}
        isWinner={!!awayId && winnerId === awayId}
        disabled={!awayId}
        onClick={() => awayId && onPickWinner(match.id, awayId)}
      />
    </div>
  )
}

function KoSlot({
  team,
  placeholder,
  isWinner,
  disabled,
  onClick,
}: {
  team: Team | null | undefined
  placeholder: string
  isWinner: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`ko-slot ${isWinner ? 'is-winner' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isWinner}
      aria-label={team ? `Pick ${team.name}` : placeholder}
    >
      {team ? (
        <>
          <CountryFlag
            countryCode={team.countryCode}
            countryName={team.name}
            size="sm"
          />
          <span className="ko-slot__name">{team.name}</span>
        </>
      ) : (
        <span className="ko-slot__placeholder">{placeholder}</span>
      )}
      {isWinner && <span className="ko-slot__check" aria-hidden="true">✓</span>}
    </button>
  )
}

function describeSlot(ref: SlotRef): string {
  if (ref.kind === 'groupFirst') return `1st in ${ref.letter}`
  if (ref.kind === 'groupSecond') return `2nd in ${ref.letter}`
  if (ref.kind === 'bestThird') return `Wildcard #${ref.index + 1}`
  return `Winner of ${ref.matchId.toUpperCase()}`
}
