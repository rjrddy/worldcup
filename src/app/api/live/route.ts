import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export const dynamic = 'force-dynamic'

/**
 * Returns live status keyed by fixture id, e.g.
 *   { "af-1489369": { statusShort: "2H", elapsed: 67, scoreHome: 1, scoreAway: 0, hasLineups: true }, ... }
 *
 * Polled by the home/standings/bracket pages every 60s to refresh badges.
 */
export async function GET() {
  const provider = getProvider()
  const statuses = await provider.getLiveStatuses()
  return NextResponse.json(statuses, {
    headers: {
      // The cron updates Supabase every 60s, so honoring CDN caching for 15s
      // smooths bursts while keeping the UI feeling fresh.
      'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=30',
    },
  })
}
