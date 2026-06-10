/**
 * Bracket structure & helpers
 *
 * 16-team single-elim KO:
 *   12 group winners (1A–1L) + 4 best runners-up (user-picked from 12)
 *   → R16 (8) → QF (4) → SF (2) → Final (1) = 15 picks total
 *
 * The 4 best-runners-up fill bracket slots BR1–BR4 in the order the user
 * picked them. Pairings are hardcoded below.
 */

export const GROUP_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
] as const
export type GroupLetter = (typeof GROUP_LETTERS)[number]

export const N_BEST_RUNNERS_UP = 4

/** A slot in the bracket: either a group winner, a best-2nd slot, or a previous match's winner. */
export type SlotRef =
  | { kind: 'groupFirst'; letter: GroupLetter }
  | { kind: 'bestSecond'; index: 0 | 1 | 2 | 3 }
  | { kind: 'winner'; matchId: string }

export interface MatchSlot {
  id: string
  round: 'r16' | 'qf' | 'sf' | 'final'
  label: string
  home: SlotRef
  away: SlotRef
}

const G = (letter: GroupLetter): SlotRef => ({ kind: 'groupFirst', letter })
const BR = (i: 0 | 1 | 2 | 3): SlotRef => ({ kind: 'bestSecond', index: i })
const W = (matchId: string): SlotRef => ({ kind: 'winner', matchId })

/** Hardcoded bracket template. Top half feeds SF1, bottom half feeds SF2. */
export const BRACKET_TEMPLATE: MatchSlot[] = [
  // Round of 16 — 8 matches
  // Top half
  { id: 'r16-1', round: 'r16', label: 'R16 · 1', home: G('A'), away: BR(0) },
  { id: 'r16-2', round: 'r16', label: 'R16 · 2', home: G('C'), away: G('D') },
  { id: 'r16-3', round: 'r16', label: 'R16 · 3', home: G('E'), away: BR(1) },
  { id: 'r16-4', round: 'r16', label: 'R16 · 4', home: G('G'), away: G('H') },
  // Bottom half
  { id: 'r16-5', round: 'r16', label: 'R16 · 5', home: G('B'), away: BR(2) },
  { id: 'r16-6', round: 'r16', label: 'R16 · 6', home: G('I'), away: G('J') },
  { id: 'r16-7', round: 'r16', label: 'R16 · 7', home: G('F'), away: BR(3) },
  { id: 'r16-8', round: 'r16', label: 'R16 · 8', home: G('K'), away: G('L') },

  // Quarter-finals — 4 matches
  { id: 'qf-1', round: 'qf', label: 'QF · 1', home: W('r16-1'), away: W('r16-2') },
  { id: 'qf-2', round: 'qf', label: 'QF · 2', home: W('r16-3'), away: W('r16-4') },
  { id: 'qf-3', round: 'qf', label: 'QF · 3', home: W('r16-5'), away: W('r16-6') },
  { id: 'qf-4', round: 'qf', label: 'QF · 4', home: W('r16-7'), away: W('r16-8') },

  // Semi-finals — 2 matches
  { id: 'sf-1', round: 'sf', label: 'SF · 1', home: W('qf-1'), away: W('qf-2') },
  { id: 'sf-2', round: 'sf', label: 'SF · 2', home: W('qf-3'), away: W('qf-4') },

  // Final
  { id: 'final', round: 'final', label: 'Final', home: W('sf-1'), away: W('sf-2') },
]

export interface GroupPicks {
  [letter: string]: { first?: string; second?: string }
}

export interface KoPicks {
  /** Ordered list of group letters whose 2nd-placed team advances (max 4). */
  bestRunnersUp?: string[]
  /** Map from match id → winning team id. */
  winners?: Record<string, string>
}

/**
 * Resolve a slot ref to a concrete team id (or null if not yet decided).
 */
export function resolveSlot(
  ref: SlotRef,
  groupPicks: GroupPicks,
  koPicks: KoPicks
): string | null {
  if (ref.kind === 'groupFirst') {
    return groupPicks[ref.letter]?.first ?? null
  }
  if (ref.kind === 'bestSecond') {
    const letter = koPicks.bestRunnersUp?.[ref.index]
    if (!letter) return null
    return groupPicks[letter]?.second ?? null
  }
  // winner of an earlier match
  return koPicks.winners?.[ref.matchId] ?? null
}

/** True when all group picks are made AND best-2nds are selected. */
export function bracketCanStart(
  groupPicks: GroupPicks,
  koPicks: KoPicks
): boolean {
  const groupsComplete = GROUP_LETTERS.every(
    (l) => groupPicks[l]?.first && groupPicks[l]?.second
  )
  const bestEnough =
    (koPicks.bestRunnersUp?.filter(Boolean).length ?? 0) === N_BEST_RUNNERS_UP
  return groupsComplete && bestEnough
}
