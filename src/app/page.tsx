import type { Metadata } from 'next'
import { getProvider } from '@/lib/providers'
import { MatchList } from '@/components/MatchList'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Schedule — World Cup 2026',
}

export default async function HomePage() {
  const provider = getProvider()
  const matches = await provider.getMatches()

  const facts = [
    { v: '48', l: 'Teams' },
    { v: '104', l: 'Matches' },
    { v: '12', l: 'Groups' },
    { v: '3', l: 'Host nations' },
    { v: 'Jun 11', l: 'Kick-off' },
    { v: 'Jul 19', l: 'Final' },
  ]

  return (
    <>
      <header className="home-hero" role="banner">
        <div className="home-hero__inner">
          <p className="home-hero__eyebrow">FIFA World Cup™ · 2026</p>
          <h1 className="home-hero__title">
            <span className="home-hero__title-the">The</span>
            <span className="home-hero__title-word">Maracanã</span>
          </h1>
          <p className="home-hero__sub">
            <span aria-hidden="true">●</span>{' '}
            Every match, every squad, your bracket.{' '}
            <span aria-hidden="true">●</span>
          </p>
          <p className="home-hero__lede">
            48 nations. 104 matches. Three host countries. Pick your favorite,
            build a bracket, and follow every starting XI from the opener in
            Mexico City to the final in New York.
          </p>
          <dl className="home-hero__facts" aria-label="Tournament facts">
            {facts.map(({ v, l }) => (
              <div key={l} className="home-hero__fact">
                <dt className="home-hero__fact-label">{l}</dt>
                <dd className="home-hero__fact-value">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main className="page-shell" id="main-content">
        <MatchList matches={matches} />
      </main>
    </>
  )
}
