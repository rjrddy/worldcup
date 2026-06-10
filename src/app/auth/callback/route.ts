import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase OAuth callback handler.
 * Google → Supabase → here. Exchanges the code for a session and redirects
 * back to the originating page (or '/' if none).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/?auth_error=not_configured`)
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed; bounce to home with a banner-able query param
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
