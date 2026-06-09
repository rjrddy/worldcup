'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CURRENCIES, type Currency } from '@/lib/currency'

const STORAGE_KEY = 'worldcup-currency'

interface Ctx {
  currency: Currency
  setCurrency: (c: Currency) => void
  hydrated: boolean
}

const CurrencyContext = createContext<Ctx>({
  currency: 'EUR',
  setCurrency: () => {},
  hydrated: false,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('EUR')
  const [hydrated, setHydrated] = useState(false)

  // Read persisted choice on mount. SSR renders EUR; client flips after hydration.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Currency | null
      if (stored && (CURRENCIES as readonly string[]).includes(stored)) {
        setCurrencyState(stored)
      }
    } catch {
      /* private mode / disabled storage — ignore */
    }
    setHydrated(true)
  }, [])

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      /* ignore */
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, hydrated }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
