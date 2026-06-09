'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CountryFlag } from '@/components/CountryFlag'

type Slot = 'first' | 'second'
type GroupPicks = Record<string, { first?: string; second?: string }>

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
  initialKoPicks: Record<string, string>
}

export function BracketEditor({
  userId,
  groups,
  initialGroupPicks,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialKoPicks,
}: Props) {
  const supabase = createClient()
  const [picks, setPicks] = useState<GroupPicks>(initialGroupPicks ?? {})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Debounced auto-save. Runs ~600ms after the last pick change.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void save(picks)
    }, 600)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  async function save(next: GroupPicks) {
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('brackets')
      .upsert(
        {
          user_id: userId,
          group_picks: next,
        },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setSavedAt(new Date())
    }
  }

  function pickSlot(groupLetter: string, slot: Slot, teamId: string) {
    setPicks((prev) => {
      const current = prev[groupLetter] ?? {}
      const next = { ...current, [slot]: teamId }
      // If the same team was already in the other slot, clear it
      const otherSlot: Slot = slot === 'first' ? 'second' : 'first'
      if (next[otherSlot] === teamId) {
        next[otherSlot] = undefined
      }
      return { ...prev, [groupLetter]: next }
    })
  }

  const completedGroups = groups.filter(
    (g) => picks[g.letter]?.first && picks[g.letter]?.second
  ).length

  return (
    <>
      <div className="bracket-status" role="status" aria-live="polite">
        <span className="bracket-status__progress">
          <strong>{completedGroups}</strong>
          <span> of {groups.length} groups picked</span>
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

      <div className="bracket-groups">
        {groups.map((g) => (
          <GroupCard
            key={g.letter}
            group={g}
            picks={picks[g.letter] ?? {}}
            onPick={(slot, teamId) => pickSlot(g.letter, slot, teamId)}
          />
        ))}
      </div>

      <section className="bracket-ko-placeholder">
        <h2 className="bracket-ko-placeholder__title">Knockout bracket</h2>
        <p className="bracket-ko-placeholder__sub">
          The 32 → 16 → 8 → 4 → final bracket diagram opens once the group
          stage standings come in. Your group picks above seed it
          automatically.
        </p>
      </section>
    </>
  )
}

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
          const slot = isFirst ? 1 : isSecond ? 2 : null
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
              <div
                className="bracket-group__pick-buttons"
                role="group"
                aria-label={`Predict ${t.name}'s finish in group ${group.letter}`}
              >
                <button
                  type="button"
                  className={`bracket-pick-btn ${
                    isFirst ? 'is-active is-first' : ''
                  }`}
                  onClick={() => onPick('first', t.id)}
                  aria-pressed={isFirst}
                  aria-label={`Pick ${t.name} as 1st`}
                >
                  1st
                </button>
                <button
                  type="button"
                  className={`bracket-pick-btn ${
                    isSecond ? 'is-active is-second' : ''
                  }`}
                  onClick={() => onPick('second', t.id)}
                  aria-pressed={isSecond}
                  aria-label={`Pick ${t.name} as 2nd`}
                >
                  2nd
                </button>
              </div>
              {slot && (
                <span
                  className="bracket-group__slot-tag"
                  aria-hidden="true"
                >
                  #{slot}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}
