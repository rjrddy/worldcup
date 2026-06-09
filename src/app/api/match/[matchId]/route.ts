import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export async function GET(
  _req: Request,
  { params }: { params: { matchId: string } }
) {
  const provider = getProvider()
  const detail = await provider.getMatchDetail(params.matchId)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(detail)
}
