import type { Metadata } from 'next'
import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  JetBrains_Mono,
  DM_Serif_Display,
} from 'next/font/google'
import './globals.css'
import { CurrencyProvider } from '@/components/CurrencyProvider'
import { AppHeader } from '@/components/AppHeader'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// Retro serif for the brand wordmark. Italic option gives classic, broadcast-poster feel.
const serifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s — The Maracanã',
    default: 'The Maracanã — World Cup 2026',
  },
  description:
    'Every match, every squad, your bracket — FIFA World Cup 2026 USA/Canada/Mexico',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${mono.variable} ${serifDisplay.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <CurrencyProvider>
          <AppHeader />
          <div id="main-content">{children}</div>
        </CurrencyProvider>
      </body>
    </html>
  )
}
