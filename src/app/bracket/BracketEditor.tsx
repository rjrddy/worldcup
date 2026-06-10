'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CountryFlag } from '@/components/CountryFlag'
import {
  BRACKET_TEMPLATE,
  GROUP_LETTERS,
  N_BEST_RUNNERS_UP,
  bracketCanStart,
  resolveSlot,
  type GroupPicks,
  type KoPicks,
  type MatchSlot,
  type SlotRef,
} from '@/lib/bracket'

type Slot = 'first' | 'second'

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
        {
          user_id: userId,
          group_picks: g,
          ko_picks: k,
        },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    if (error) setError(error.message)
    else setSavedAt(new Date())
  }

  // ── Group pick handlers ──────────────────────────────────
  function pickSlot(groupLetter: string, slot: Slot, teamId: string) {
    setGroupPicks((prev) => {
      const current = prev[groupLetter] ?? {}
      const next = { ...current, [slot]: teamId }
      const other: Slot = slot === 'first' ? 'second' : 'first'
      if (next[other] === teamId) next[other] = undefined
      return { ...prev, [groupLetter]: next }
    })
    // If the 2nd-place pick for a group changes, that group might be in
    // bestRunnersUp; the KO picks that depend on it will resolve to the
    // new team automatically, so no extra work here.
  }

  // ── Best runners-up handlers ─────────────────────────────
  function toggleBestSecond(letter: string) {
    setKoPicks((prev) => {
      const current = prev.bestRunnersUp ?? []
      const idx = current.indexOf(letter)
      let next: string[]
      if (idx >= 0) {
        // already picked → remove
        next = current.filter((l) => l !== letter)
      } else {
        // not picked → add (cap at N)
        if (current.length >= N_BEST_RUNNERS_UP) return prev
        next = [...current, letter]
      }
      // Reset any KO winner picks that referenced removed teams
      return { ...prev, bestRunnersUp: next }
    })
  }

  // ── KO match winner picker ───────────────────────────────
  function pickWinner(matchId: string, teamId: string) {
    setKoPicks((prev) => {
      const winners = { ...(prev.winners ?? {}) }
      // Toggle off if same team clicked twice
      if (winners[matchId] === teamId) {
        delete winners[matchId]
      } else {
        winners[matchId] = teamId
      }
      // Clear any downstream picks that were inherited from this match
      // (otherwise the bracket can show "Team X advances" where Team X is no longer the winner)
      clearDownstreamWinners(matchId, winners)
      return { ...prev, winners }
    })
  }

  function clearDownstreamWinners(
    sourceMatchId: string,
    winners: Record<string, string>
  ) {
    // Walk the bracket: for each match, if either ref is winner(sourceMatchId)
    // and that match has a winner pick, clear it (and recurse).
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
  const completedGroups = groups.filter(
    (g) => groupPicks[g.letter]?.first && groupPicks[g.letter]?.second
  ).length

  const canStartKO = bracketCanStart(groupPicks, koPicks)
  const championId = koPicks.winners?.['final']
  const champion = championId ? teamById.get(championId) : null

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <div className="bracket-status" role="status" aria-live="polite">
        <span className="bracket-status__progress">
          <strong>{completedGroups}</strong>
          <span> / {groups.length} groups</span>
          <span aria-hidden="true"> · </span>
          <strong>{koPicks.bestRunnersUp?.length ?? 0}</strong>
          <span> / {N_BEST_RUNNERS_UP} wildcards</span>
          <span aria-hidden="true"> · </span>
          <strong>{Object.keys(koPicks.winners ?? {}).length}</strong>
          <span> / 15 KO picks</span>
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

      {/* ─── Group stage ─── */}
      <section aria-labelledby="groups-section-title">
        <h2 id="groups-section-title" className="bracket-section-title">
          Group stage
        </h2>
        <p className="bracket-section-sub">
          Pick your top 2 in every group. The 12 group winners auto-fill the
          knockout bracket below.
        </p>
        <div className="bracket-groups">
          {groups.map((g) => (
            <GroupCard
              key={g.letter}
              group={g}
              picks={groupPicks[g.letter] ?? {}}
              onPick={(slot, teamId) => pickSlot(g.letter, slot, teamId)}
            />
          ))}
        </div>
      </section>

      {/* ─── Best runners-up picker ─── */}
      <section aria-labelledby="wildcards-section-title">
        <h2 id="wildcards-section-title" className="bracket-section-title">
          Wildcard slots
        </h2>
        <p className="bracket-section-sub">
          Four of the twelve group runners-up advance to fill out the Round of
          16. Pick the four you think make it.
        </p>
        <div className="bracket-wildcards">
          {GROUP_LETTERS.map((letter) => {
            const idx = koPicks.bestRunnersUp?.indexOf(letter) ?? -1
            const isPicked = idx >= 0
            const secondPickId = groupPicks[letter]?.second
            const team = secondPickId ? teamById.get(secondPickId) : null
            const disabledNoPick = !team
            const disabledFull =
              !isPicked &&
              (koPicks.bestRunnersUp?.length ?? 0) >= N_BEST_RUNNERS_UP

            return (
              <button
                key={letter}
                type="button"
                className={`bracket-wildcard ${isPicked ? 'is-picked' : ''}`}
                onClick={() => toggleBestSecond(letter)}
                disabled={disabledNoPick || disabledFull}
                aria-pressed={isPicked}
                title={
                  disabledNoPick
                    ? `Pick a 2nd in group ${letter} first`
                    : disabledFull
                    ? `${N_BEST_RUNNERS_UP} wildcards already selected`
                    : undefined
                }
              >
                <span className="bracket-wildcard__letter">{letter}</span>
                <span className="bracket-wildcard__divider" aria-hidden="true">
                  2nd
                </span>
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
                    <span className="bracket-wildcard__empty">— pick group {letter} 2nd —</span>
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

      {/* ─── KO bracket ─── */}
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
                have a 1st &amp; 2nd ({completedGroups}/12)
              </li>
              <li className={(koPicks.bestRunnersUp?.length ?? 0) === N_BEST_RUNNERS_UP ? 'is-done' : ''}>
                {(koPicks.bestRunnersUp?.length ?? 0) === N_BEST_RUNNERS_UP
                  ? '✓'
                  : '○'}{' '}
                {N_BEST_RUNNERS_UP} wildcards picked (
                {koPicks.bestRunnersUp?.length ?? 0}/{N_BEST_RUNNERS_UP})
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

      {/* ─── Champion ─── */}
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
// GroupCard — same as before, unchanged contract
// ──────────────────────────────────────────────────────────
function GroupCard({
  group,
  picks,
  onPick,
}: {
  group: Group
  picks: { first?: string; second?: string }
  onPick: (slot: Slot, teamId: string) => void
}) {
  return (
    <article className="bracket-group" aria-labelledby={`group-${group.letter}`}>
      <header className="bracket-group__header">
        <h3 id={`group-${group.letter}`} className="bracket-group__letter">
          {group.letter}
        </h3>
        <span className="bracket-group__hint">Pick top 2</span>
      </header>
      <ul className="bracket-group__teams" role="list">
        {group.teams.map((t) => {
          const isFirst = picks.first === t.id
          const isSecond = picks.second === t.id
          return (
            <li key={t.id} className="bracket-group__team-row">
              <div className="bracket-group__team-id">
                <CountryFlag
                  countryCode={t.countryCode}
                  countryName={t.name}
                  size="sm"
                />
                <span className="bracket-group__team-name">{t.name}</span>
              </div>
              <div className="bracket-group__pick-buttons" role="group" aria-label={`Predict ${t.name} in group ${group.letter}`}>
                <button
                  type="button"
                  className={`bracket-pick-btn ${isFirst ? 'is-active is-first' : ''}`}
                  onClick={() => onPick('first', t.id)}
                  aria-pressed={isFirst}
                  aria-label={`Pick ${t.name} as 1st`}
                >
                  1st
                </button>
                <button
                  type="button"
                  className={`bracket-pick-btn ${isSecond ? 'is-active is-second' : ''}`}
                  onClick={() => onPick('second', t.id)}
                  aria-pressed={isSecond}
                  aria-label={`Pick ${t.name} as 2nd`}
                >
                  2nd
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

// ──────────────────────────────────────────────────────────
// KoBracket — 4 rounds laid out left → right on desktop
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
      {isWinner && (
        <span className="ko-slot__check" aria-hidden="true">✓</span>
      )}
    </button>
  )
}

function describeSlot(ref: SlotRef): string {
  if (ref.kind === 'groupFirst') return `Winner of group ${ref.letter}`
  if (ref.kind === 'bestSecond') return `Wildcard #${ref.index + 1}`
  return `Winner of ${ref.matchId.toUpperCase()}`
}
