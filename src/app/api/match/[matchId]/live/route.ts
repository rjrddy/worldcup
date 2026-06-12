import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export const dynamic = 'force-dynamic'

/**
 * Returns live status + events timeline for one match.
 * Polled by the match detail page every 30s when the match is in-progress.
 *
 *   {
 *     status: { fixtureId, statusShort, elapsed, scoreHome, scoreAway, ... },
 *     events: [ { minute, type, detail, playerName, teamName, ... }, ... ]
 *   }
 */
export async function GET(
  _req: Request,
  { params }: { params: { matchId: string } }
) {
  const provider = getProvider()
  const [statuses, events] = await Promise.all([
    provider.getLiveStatuses(),
    provider.getMatchEvents(params.matchId),
  ])
  return NextResponse.json(
    {
      status: statuses[params.matchId] ?? null,
      events,
    },
    {
      headers: {
        'Cache-Control':
          'public, max-age=0, s-maxage=10, stale-while-revalidate=20',
      },
    }
  )
}
