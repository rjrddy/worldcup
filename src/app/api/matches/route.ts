import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export async function GET() {
  const provider = getProvider()
  const matches = await provider.getMatches()
  return NextResponse.json(matches)
}
