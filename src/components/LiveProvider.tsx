'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { LiveStatus } from '@/lib/types'

interface Ctx {
  /** Map of fixtureId -> LiveStatus for every fixture with any data. */
  statuses: Record<string, LiveStatus>
  /** True after the first fetch completes (avoid flashing badges in/out). */
  hydrated: boolean
}

const LiveContext = createContext<Ctx>({ statuses: {}, hydrated: false })

const POLL_MS = 60_000

export function LiveProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, LiveStatus>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as Record<string, LiveStatus>
        if (!cancelled) {
          setStatuses(json)
          setHydrated(true)
        }
      } catch {
        // Network issues happen — keep last-known good state, try again next tick.
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <LiveContext.Provider value={{ statuses, hydrated }}>
      {children}
    </LiveContext.Provider>
  )
}

/** Returns live status for a given fixture id (or undefined). */
export function useLiveStatus(matchId: string): LiveStatus | undefined {
  return useContext(LiveContext).statuses[matchId]
}

export function useLiveHydrated(): boolean {
  return useContext(LiveContext).hydrated
}
