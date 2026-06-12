import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * USE ONLY IN SERVER-ONLY CONTEXTS (cron jobs, server actions, API routes
 * that need to write to public tables). Never expose to the client.
 *
 * Returns null when env vars are missing so build/dev without Supabase
 * doesn't crash.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
