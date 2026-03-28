import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Providers from '@/components/layout/Providers'
import './globals.css'

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-display',
  display:  'swap',
})

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-body',
  display:  'swap',
})

const jetbrains = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
})

export const metadata: Metadata = {
  title:       { default: 'VentureWiki', template: '%s · VentureWiki' },
  description: 'The collaborative encyclopedia for digital business plans — Web Apps, Websites, and AI Agents.',
  keywords:    ['business plan', 'startup', 'AI agents', 'web app', 'collaboration', 'wiki'],
  authors:     [{ name: 'VentureWiki' }],
  openGraph: {
    type:        'website',
    siteName:    'VentureWiki',
    title:       'VentureWiki — Collaborative Business Plan Wiki',
    description: 'Build, share, and iterate on business plans together.',
  },
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="bg-ink text-paper font-body antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: { background: '#1C1C28', border: '1px solid #2E2E40', color: '#F7F5F0' },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
