import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/providers'
import type { Match } from '@/lib/types'
import { BracketEditor } from './BracketEditor'

export const metadata: Metadata = { title: 'My Bracket' }
export const dynamic = 'force-dynamic'

interface Group {
  letter: string
  teams: { id: string; name: string; countryCode: string }[]
}

function buildGroups(matches: Match[]): Group[] {
  const byLetter = new Map<string, Group>()
  for (const m of matches) {
    const letter = m.group ?? 'KO'
    let g = byLetter.get(letter)
    if (!g) {
      g = { letter, teams: [] }
      byLetter.set(letter, g)
    }
    const seen = new Set(g.teams.map((t) => t.id))
    if (!seen.has(m.home.id)) g.teams.push(m.home)
    if (!seen.has(m.away.id)) g.teams.push(m.away)
  }
  return [...byLetter.values()]
    .sort((a, b) => a.letter.localeCompare(b.letter))
    .map((g) => ({
      ...g,
      teams: g.teams.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export default async function BracketPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?signin=1')
  }

  const matches = await getProvider().getMatches()
  const groups = buildGroups(matches)

  const { data: bracket } = await supabase
    .from('brackets')
    .select('group_picks, ko_picks, updated_at')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="page-shell" id="main-content">
      <header className="bracket-hero">
        <p className="bracket-hero__eyebrow">My bracket</p>
        <h1 className="bracket-hero__title">
          Predict the <span className="bracket-hero__title-accent">tournament</span>
        </h1>
        <p className="bracket-hero__lede">
          Pick the top 2 in every group. Once group play wraps, your knockout
          bracket fills in and you can pick winners through the final.
        </p>
      </header>

      <BracketEditor
        userId={user.id}
        groups={groups}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialGroupPicks={(bracket?.group_picks as any) ?? {}}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialKoPicks={(bracket?.ko_picks as any) ?? {}}
      />
    </main>
  )
}
