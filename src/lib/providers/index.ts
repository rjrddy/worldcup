import type { WorldCupDataProvider } from '@/lib/types'
import { mockProvider } from './mock'
import { fotmobProvider } from './fotmob'
import { apiFootballProvider } from './api-football'

export function getProvider(): WorldCupDataProvider {
  const env = process.env.DATA_PROVIDER ?? 'mock'
  if (env === 'fotmob') return fotmobProvider
  if (env === 'api-football') return apiFootballProvider
  return mockProvider
}
