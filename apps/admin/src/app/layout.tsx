import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const envName = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development'
const titlePrefix = envName === 'production' ? '' : `[${envName.toUpperCase()}] `

export const metadata: Metadata = {
  title: `${titlePrefix}NovaFit — Panel Administrativo`,
  description: 'Sistema de gestión de visitas para NovaFit Gym',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0b0f',
}

import { DevDateTools } from '@/components/DevDateTools'

const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
        <DevDateTools />
        {!isProduction && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] bg-warning text-warning-foreground text-[10px] font-bold px-4 py-0.5 rounded-b shadow-lg uppercase tracking-widest pointer-events-none opacity-80">
            Ambiente de Desarrollo
          </div>
        )}
      </body>
    </html>
  )
}
