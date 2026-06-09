'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. Use in Client Components for sign-in/out
 * flows, realtime subscriptions, etc. Reads cookies set by the server flow.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
