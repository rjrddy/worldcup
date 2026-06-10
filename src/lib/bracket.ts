/**
 * Bracket structure & helpers — full WC 2026 format
 *
 *   Group stage: 12 groups × 4 teams → pick 1st / 2nd / 3rd / 4th in each
 *
 *   Knockout: 32 → 16 → 8 → 4 → final (31 picks total)
 *     32 = 12 group winners + 12 runners-up + 8 best 3rd-placed teams (user picks 8 of 12)
 *
 *   Pairings: a clean self-consistent template (not strictly FIFA's published
 *   bracket, but every team is used exactly once and the bracket flows
 *   tournament-style left → right).
 */

export const GROUP_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
] as const
export type GroupLetter = (typeof GROUP_LETTERS)[number]

export const N_BEST_THIRDS = 8

/** Where a slot in the bracket gets its team from. */
export type SlotRef =
  | { kind: 'groupFirst'; letter: GroupLetter }
  | { kind: 'groupSecond'; letter: GroupLetter }
  | { kind: 'bestThird'; index: number } // 0..N_BEST_THIRDS-1
  | { kind: 'winner'; matchId: string }

export interface MatchSlot {
  id: string
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  label: string
  home: SlotRef
  away: SlotRef
}

const F = (letter: GroupLetter): SlotRef => ({ kind: 'groupFirst', letter })
const S = (letter: GroupLetter): SlotRef => ({ kind: 'groupSecond', letter })
const B3 = (i: number): SlotRef => ({ kind: 'bestThird', index: i })
const W = (matchId: string): SlotRef => ({ kind: 'winner', matchId })

/**
 * 16 R32 matches using exactly 12 winners + 12 runners-up + 8 best-3rds.
 *
 *   M1–M8:   1st vs 3rd-wildcard           (8 winners face wildcards)
 *   M9–M12:  1st vs 2nd (cross-group)      (4 winners face 2nds)
 *   M13–M16: 2nd vs 2nd                    (remaining 2nds clash)
 */
export const BRACKET_TEMPLATE: MatchSlot[] = [
  // Round of 32
  { id: 'r32-1',  round: 'r32', label: 'R32 · 1',  home: F('A'), away: B3(0) },
  { id: 'r32-2',  round: 'r32', label: 'R32 · 2',  home: F('B'), away: B3(1) },
  { id: 'r32-3',  round: 'r32', label: 'R32 · 3',  home: F('C'), away: B3(2) },
  { id: 'r32-4',  round: 'r32', label: 'R32 · 4',  home: F('D'), away: B3(3) },
  { id: 'r32-5',  round: 'r32', label: 'R32 · 5',  home: F('E'), away: B3(4) },
  { id: 'r32-6',  round: 'r32', label: 'R32 · 6',  home: F('F'), away: B3(5) },
  { id: 'r32-7',  round: 'r32', label: 'R32 · 7',  home: F('G'), away: B3(6) },
  { id: 'r32-8',  round: 'r32', label: 'R32 · 8',  home: F('H'), away: B3(7) },
  { id: 'r32-9',  round: 'r32', label: 'R32 · 9',  home: F('I'), away: S('A') },
  { id: 'r32-10', round: 'r32', label: 'R32 · 10', home: F('J'), away: S('B') },
  { id: 'r32-11', round: 'r32', label: 'R32 · 11', home: F('K'), away: S('C') },
  { id: 'r32-12', round: 'r32', label: 'R32 · 12', home: F('L'), away: S('D') },
  { id: 'r32-13', round: 'r32', label: 'R32 · 13', home: S('E'), away: S('F') },
  { id: 'r32-14', round: 'r32', label: 'R32 · 14', home: S('G'), away: S('H') },
  { id: 'r32-15', round: 'r32', label: 'R32 · 15', home: S('I'), away: S('J') },
  { id: 'r32-16', round: 'r32', label: 'R32 · 16', home: S('K'), away: S('L') },

  // Round of 16
  { id: 'r16-1', round: 'r16', label: 'R16 · 1', home: W('r32-1'),  away: W('r32-2') },
  { id: 'r16-2', round: 'r16', label: 'R16 · 2', home: W('r32-3'),  away: W('r32-4') },
  { id: 'r16-3', round: 'r16', label: 'R16 · 3', home: W('r32-5'),  away: W('r32-6') },
  { id: 'r16-4', round: 'r16', label: 'R16 · 4', home: W('r32-7'),  away: W('r32-8') },
  { id: 'r16-5', round: 'r16', label: 'R16 · 5', home: W('r32-9'),  away: W('r32-10') },
  { id: 'r16-6', round: 'r16', label: 'R16 · 6', home: W('r32-11'), away: W('r32-12') },
  { id: 'r16-7', round: 'r16', label: 'R16 · 7', home: W('r32-13'), away: W('r32-14') },
  { id: 'r16-8', round: 'r16', label: 'R16 · 8', home: W('r32-15'), away: W('r32-16') },

  // Quarter-finals
  { id: 'qf-1', round: 'qf', label: 'QF · 1', home: W('r16-1'), away: W('r16-2') },
  { id: 'qf-2', round: 'qf', label: 'QF · 2', home: W('r16-3'), away: W('r16-4') },
  { id: 'qf-3', round: 'qf', label: 'QF · 3', home: W('r16-5'), away: W('r16-6') },
  { id: 'qf-4', round: 'qf', label: 'QF · 4', home: W('r16-7'), away: W('r16-8') },

  // Semi-finals
  { id: 'sf-1', round: 'sf', label: 'SF · 1', home: W('qf-1'), away: W('qf-2') },
  { id: 'sf-2', round: 'sf', label: 'SF · 2', home: W('qf-3'), away: W('qf-4') },

  // Final
  { id: 'final', round: 'final', label: 'Final', home: W('sf-1'), away: W('sf-2') },
]

export type Position = 'first' | 'second' | 'third' | 'fourth'
export const POSITIONS: Position[] = ['first', 'second', 'third', 'fourth']
export const POSITION_LABEL: Record<Position, string> = {
  first: '1st',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
}

export interface GroupPicks {
  [letter: string]: Partial<Record<Position, string>>
}

export interface KoPicks {
  /** Ordered list of group letters whose 3rd-placed team advances (length up to N_BEST_THIRDS). */
  bestThirds?: string[]
  /** Map from match id → winning team id. */
  winners?: Record<string, string>
  // Legacy shape — older brackets used `bestRunnersUp`. Tolerated on read; ignored.
  bestRunnersUp?: string[]
}

/** Resolve a slot ref to a concrete team id (or null if not yet decided). */
export function resolveSlot(
  ref: SlotRef,
  groupPicks: GroupPicks,
  koPicks: KoPicks
): string | null {
  if (ref.kind === 'groupFirst') {
    return groupPicks[ref.letter]?.first ?? null
  }
  if (ref.kind === 'groupSecond') {
    return groupPicks[ref.letter]?.second ?? null
  }
  if (ref.kind === 'bestThird') {
    const letter = koPicks.bestThirds?.[ref.index]
    if (!letter) return null
    return groupPicks[letter]?.third ?? null
  }
  return koPicks.winners?.[ref.matchId] ?? null
}

/** True when every group has 1/2/3/4 picked AND the 8 best-3rds are selected. */
export function bracketCanStart(
  groupPicks: GroupPicks,
  koPicks: KoPicks
): boolean {
  const groupsComplete = GROUP_LETTERS.every((l) => {
    const g = groupPicks[l]
    return g?.first && g?.second && g?.third && g?.fourth
  })
  const bestThirdsPicked =
    (koPicks.bestThirds?.filter(Boolean).length ?? 0) === N_BEST_THIRDS
  return groupsComplete && bestThirdsPicked
}
