import type { SalaryProvider, Salary } from '@/lib/types'

// All values are gross base salary normalized to EUR. UI converts at render.
const salaryMap: Record<string, Salary> = {
  'bra-vinicius': { annualEur: 25_000_000, source: 'Capology 2025-26' },
  'bra-rodrygo': { annualEur: 8_000_000, source: 'Capology 2025-26' },
  'bra-alisson': { annualEur: 11_500_000, source: 'Spotrac 2025-26' },
  'bra-casemiro': { annualEur: 16_000_000, source: 'Spotrac 2025-26' },
  'bra-militao': { annualEur: 10_000_000, source: 'Capology 2025-26' },
  'bra-marquinhos': { annualEur: 11_000_000, source: 'Capology 2025-26' },
  'bra-lucas-paqueta': { annualEur: 10_500_000, source: 'Spotrac 2025-26' },
  'bra-richarlison': { annualEur: 8_300_000, source: 'Spotrac 2025-26' },
  'bra-bruno-guimaraes': { annualEur: 7_300_000, source: 'Spotrac 2025-26' },
  'bra-raphinha': { annualEur: 9_000_000, source: 'Capology 2025-26' },
  'bra-endrick': { annualEur: 4_000_000, source: 'Capology 2025-26' },
  'bra-gabriel-magalhaes': { annualEur: 8_000_000, source: 'Spotrac 2025-26' },
  'bra-gabriel-martinelli': { annualEur: 5_500_000, source: 'Spotrac 2025-26' },

  'mar-achraf': { annualEur: 13_640_000, source: 'Capology 2025-26' },
  'mar-amrabat': { annualEur: 4_500_000, source: 'Capology 2025-26' },
  'mar-ziyech': { annualEur: 5_000_000, source: 'Capology 2025-26' },
  'mar-bono': { annualEur: 4_000_000, source: 'Capology 2025-26' },
  'mar-dari': { annualEur: 5_000_000, source: 'Capology 2025-26' },
  'mar-ounahi': { annualEur: 3_000_000, source: 'Capology 2025-26' },
  'mar-bounou-youssef': { annualEur: 5_000_000, source: 'Capology 2025-26' },
  'mar-boufal': { annualEur: 2_500_000, source: 'Capology 2025-26' },
}

export const staticSalaryProvider: SalaryProvider = {
  getSalary(playerId: string): Salary | undefined {
    return salaryMap[playerId]
  },
}
