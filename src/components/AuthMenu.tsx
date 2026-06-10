'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function AuthMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // Memoize client so onAuthStateChange subscription stays stable.
  // Returns null during SSR / when env vars are missing.
  const supabase: SupabaseClient | null = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function signIn() {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.refresh()
  }

  // If Supabase isn't configured (no env vars), render nothing — the rest of
  // the app still works in read-only mode.
  if (!supabase) return null

  if (loading) {
    return <div className="auth-menu auth-menu--loading" aria-hidden="true" />
  }

  if (!user) {
    return (
      <button type="button" className="auth-menu__signin" onClick={signIn}>
        <GoogleIcon />
        <span>Sign in</span>
      </button>
    )
  }

  const avatar = (user.user_metadata?.avatar_url ?? null) as string | null
  const name = (user.user_metadata?.full_name ?? user.email ?? 'You') as string
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  return (
    <div className="auth-menu" ref={menuRef}>
      <button
        type="button"
        className="auth-menu__avatar-btn"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Account menu — signed in as ${name}`}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="auth-menu__avatar-img" />
        ) : (
          <span className="auth-menu__avatar-initials">{initials}</span>
        )}
      </button>

      {menuOpen && (
        <div role="menu" className="auth-menu__dropdown">
          <div className="auth-menu__user">
            <div className="auth-menu__user-name">{name}</div>
            {user.email && (
              <div className="auth-menu__user-email">{user.email}</div>
            )}
          </div>
          <hr className="auth-menu__divider" />
          <Link
            href="/profile"
            role="menuitem"
            className="auth-menu__item"
            onClick={() => setMenuOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/bracket"
            role="menuitem"
            className="auth-menu__item"
            onClick={() => setMenuOpen(false)}
          >
            My bracket
          </Link>
          <hr className="auth-menu__divider" />
          <button
            type="button"
            role="menuitem"
            className="auth-menu__item auth-menu__item--danger"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.87 0-5.29-1.94-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.32 9.13 5.38 12 5.38z"
      />
    </svg>
  )
}
