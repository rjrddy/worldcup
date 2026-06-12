import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Vercel Cron handler — runs every minute (configured in vercel.json).
 *
 * Pulls currently-live fixtures + their event timelines from api-football
 * and upserts into Supabase. The client app polls Supabase to render fresh
 * scores, kickoff, half-time / full-time, goals, and cards.
 *
 * Authorization: Vercel automatically signs cron requests with the
 * `CRON_SECRET` env var as a Bearer token. Public requests without that
 * header are rejected.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Allow a longer execution window since we may hit api-football multiple times.
export const maxDuration = 60

const AF_BASE = 'https://v3.football.api-sports.io'
const LEAGUE_ID = Number(process.env.API_FOOTBALL_WC_LEAGUE_ID ?? '1')
const SEASON = Number(process.env.API_FOOTBALL_WC_SEASON ?? '2026')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function afFetch(path: string, params: Record<string, any>) {
  const url = new URL(`${AF_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': process.env.API_FOOTBALL_KEY ?? '',
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
    // Don't let Next cache cron data — we want a fresh response every minute
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`api-football ${res.status} on ${path}`)
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eventKey(fixtureId: string, e: any): string {
  // Stable composite key for upsert dedupe — minute+type+player should be
  // unique enough; addedMinute differentiates stoppage-time events.
  const parts = [
    fixtureId,
    e.time?.elapsed ?? 0,
    e.time?.extra ?? 0,
    e.type ?? '',
    e.detail ?? '',
    e.player?.id ?? '',
  ]
  return parts.join('|')
}

export async function GET(request: Request) {
  // Vercel-cron auth
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service client not configured' },
      { status: 500 }
    )
  }
  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json(
      { error: 'API_FOOTBALL_KEY not set' },
      { status: 500 }
    )
  }

  const started = Date.now()
  let liveCount = 0
  let eventCount = 0

  try {
    // 1) All live fixtures for the WC. One call, all matches.
    //    api-football accepts `live=all` to return every running match,
    //    but we want only WC league. Use `league=1&season=2026&live=all`.
    const liveResp = await afFetch('/fixtures', {
      league: LEAGUE_ID,
      season: SEASON,
      live: 'all',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveFixtures: any[] = liveResp?.response ?? []

    // Also pull recently-finished matches so we keep FT scores fresh until
    // their replacement live fixture starts.
    const todayResp = await afFetch('/fixtures', {
      league: LEAGUE_ID,
      season: SEASON,
      date: new Date().toISOString().slice(0, 10),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todayFixtures: any[] = todayResp?.response ?? []

    // Dedup by fixture id
    const seen = new Set<number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixtures: any[] = []
    for (const f of [...liveFixtures, ...todayFixtures]) {
      if (!f?.fixture?.id || seen.has(f.fixture.id)) continue
      seen.add(f.fixture.id)
      fixtures.push(f)
    }

    // 2) Upsert live_status for each
    const statusRows = fixtures.map((f) => ({
      fixture_id: `af-${f.fixture.id}`,
      status_short: f.fixture.status?.short ?? 'NS',
      status_long: f.fixture.status?.long ?? null,
      elapsed: f.fixture.status?.elapsed ?? null,
      added_minute: f.fixture.status?.extra ?? null,
      score_home: f.goals?.home ?? null,
      score_away: f.goals?.away ?? null,
      ht_home: f.score?.halftime?.home ?? null,
      ht_away: f.score?.halftime?.away ?? null,
      has_lineups: !!(f.lineups?.length ?? 0),
      updated_at: new Date().toISOString(),
    }))

    if (statusRows.length) {
      const { error: upErr } = await supabase
        .from('live_status')
        .upsert(statusRows, { onConflict: 'fixture_id' })
      if (upErr) throw upErr
      liveCount = statusRows.length
    }

    // 3) For each live (not just upcoming) fixture, fetch events
    const inProgress = fixtures.filter((f) =>
      ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'FT', 'AET', 'PEN'].includes(
        f.fixture.status?.short
      )
    )

    for (const f of inProgress) {
      const fixtureId = `af-${f.fixture.id}`
      try {
        const evResp = await afFetch('/fixtures/events', {
          fixture: f.fixture.id,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const events: any[] = evResp?.response ?? []
        const rows = events.map((e) => ({
          fixture_id: fixtureId,
          event_key: eventKey(fixtureId, e),
          minute: e.time?.elapsed ?? 0,
          added_minute: e.time?.extra ?? null,
          type: e.type ?? 'Unknown',
          detail: e.detail ?? null,
          team_id: e.team?.id ? `af-team-${e.team.id}` : null,
          team_name: e.team?.name ?? null,
          player_id: e.player?.id ? `af-${e.player.id}` : null,
          player_name: e.player?.name ?? null,
          assist_id: e.assist?.id ? `af-${e.assist.id}` : null,
          assist_name: e.assist?.name ?? null,
          comments: e.comments ?? null,
        }))
        if (rows.length) {
          const { error: evErr } = await supabase
            .from('match_events')
            .upsert(rows, { onConflict: 'fixture_id,event_key' })
          if (evErr) throw evErr
          eventCount += rows.length
        }
      } catch (err) {
        console.warn(`events for ${fixtureId} failed:`, err)
      }
    }

    return NextResponse.json({
      ok: true,
      fixtures: liveCount,
      events: eventCount,
      ms: Date.now() - started,
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err), ms: Date.now() - started },
      { status: 500 }
    )
  }
}
