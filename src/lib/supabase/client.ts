'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. Returns `null` when the public env vars
 * aren't set — useful during SSR/prerender or in a misconfigured deploy,
 * so importing modules don't throw. Callers must null-check.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

/** True when the public env vars are present so the auth flow can run. */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
