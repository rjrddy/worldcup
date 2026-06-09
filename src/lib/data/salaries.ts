import type { SalaryProvider, Salary } from '@/lib/types'

const salaryMap: Record<string, Salary> = {
  'bra-vinicius': { annual: 20_000_000, currency: 'EUR', source: 'Capology' },
  'bra-rodrygo': { annual: 8_000_000, currency: 'EUR', source: 'Capology' },
  'bra-alisson': { annual: 11_000_000, currency: 'EUR', source: 'Capology' },
  'bra-casemiro': { annual: 15_600_000, currency: 'EUR', source: 'Capology' },
  'bra-militao': { annual: 10_000_000, currency: 'EUR', source: 'Capology' },
  'bra-marquinhos': { annual: 9_600_000, currency: 'EUR', source: 'Capology' },
  'bra-lucas-paqueta': { annual: 10_400_000, currency: 'EUR', source: 'Capology' },
  'bra-richarlison': { annual: 8_320_000, currency: 'EUR', source: 'Capology' },
  'bra-bruno-guimaraes': { annual: 7_280_000, currency: 'EUR', source: 'Capology' },
  'bra-raphinha': { annual: 9_100_000, currency: 'EUR', source: 'Capology' },
  'bra-endrick': { annual: 4_000_000, currency: 'EUR', source: 'Capology' },

  'mar-achraf': { annual: 14_400_000, currency: 'EUR', source: 'Capology' },
  'mar-amrabat': { annual: 4_160_000, currency: 'EUR', source: 'Capology' },
  'mar-ziyech': { annual: 5_200_000, currency: 'EUR', source: 'Capology' },
  'mar-bono': { annual: 3_640_000, currency: 'EUR', source: 'Capology' },
  'mar-dari': { annual: 5_200_000, currency: 'EUR', source: 'Capology' },
  'mar-ounahi': { annual: 3_120_000, currency: 'EUR', source: 'Capology' },
  'mar-bounou-youssef': { annual: 4_680_000, currency: 'EUR', source: 'Capology' },
  'mar-boufal': { annual: 2_600_000, currency: 'EUR', source: 'Capology' },
}

export const staticSalaryProvider: SalaryProvider = {
  getSalary(playerId: string): Salary | undefined {
    return salaryMap[playerId]
  },
}
