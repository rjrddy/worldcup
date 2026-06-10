import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/providers'
import { ProfileForm } from './ProfileForm'

export const metadata: Metadata = { title: 'Profile' }

// Per-user data → can't be statically generated
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <main className="page-shell" id="main-content">
        <header className="profile-hero">
          <h1 className="profile-hero__title">Profile</h1>
          <p className="profile-hero__lede">
            Sign-in isn’t configured on this deployment yet. See{' '}
            <code>SUPABASE_SETUP.md</code>.
          </p>
        </header>
      </main>
    )
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?signin=1')
  }

  // Build the team picker list — all distinct teams from the fixture data
  const matches = await getProvider().getMatches()
  const teamMap = new Map<string, { id: string; name: string; countryCode: string }>()
  for (const m of matches) {
    teamMap.set(m.home.id, m.home)
    teamMap.set(m.away.id, m.away)
  }
  const teams = Array.from(teamMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  // Load this user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, favorite_team_id')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="page-shell" id="main-content">
      <header className="profile-hero">
        <h1 className="profile-hero__title">Profile</h1>
        <p className="profile-hero__lede">
          How you appear and which team you’re backing.
        </p>
      </header>

      <ProfileForm
        userId={user.id}
        initial={{
          displayName: profile?.display_name ?? user.user_metadata?.full_name ?? '',
          favoriteTeamId: profile?.favorite_team_id ?? null,
          email: user.email ?? '',
          avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        }}
        teams={teams}
      />
    </main>
  )
}
