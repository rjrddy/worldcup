import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProvider } from '@/lib/providers'
import { TeamPanel } from '@/components/TeamPanel'
import { CountryFlag } from '@/components/CountryFlag'
import { formatKickoff } from '@/lib/utils'

// Pre-render every match page at build time. Data is read from cached JSON
// in ./data/, so this costs no API calls and produces fully static HTML.
export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  const provider = getProvider()
  const matches = await provider.getMatches()
  return matches.map((m) => ({ matchId: m.id }))
}

interface Props {
  params: { matchId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProvider()
  const detail = await provider.getMatchDetail(params.matchId)
  if (!detail) return {}
  const { match } = detail
  return {
    title: `${match.home.name} vs ${match.away.name}`,
  }
}

export default async function MatchPage({ params }: Props) {
  const provider = getProvider()
  const detail = await provider.getMatchDetail(params.matchId)

  if (!detail) notFound()

  const { match, home, away } = detail
  const kickoffDisplay = formatKickoff(match.kickoff)
  const stageLabel = match.stage === 'group' ? `Group ${match.group}` : match.stage.toUpperCase()

  return (
    <>
      <header className="match-header" role="banner">
        <p className="match-header__stage">{stageLabel}</p>
        <div className="match-header__matchup">
          <div className="match-header__team">
            <CountryFlag countryCode={home.countryCode} countryName={home.name} size="lg" />
            <span>{home.name}</span>
          </div>
          <span className="match-header__vs" aria-hidden="true">vs</span>
          <div className="match-header__team">
            <CountryFlag countryCode={away.countryCode} countryName={away.name} size="lg" />
            <span>{away.name}</span>
          </div>
        </div>
        <h1 className="sr-only">{home.name} vs {away.name}</h1>
        <div className="match-header__meta">
          <time dateTime={match.kickoff}>{kickoffDisplay}</time>
          {match.venue && <span>{match.venue}</span>}
        </div>
      </header>

      <main className="page-shell" id="main-content">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href="/"
            className="text-sm font-mono text-ink-muted underline underline-offset-2 hover:text-accent"
          >
            ← All matches
          </Link>
        </nav>

        <div className="flex flex-col gap-10">
          <TeamPanel team={home} side="home" />
          <TeamPanel team={away} side="away" />
        </div>
      </main>
    </>
  )
}
