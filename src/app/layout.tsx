
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { SyncWorker } from '@/components/layout/SyncWorker';
import { cn } from '@/lib/utils'; // Keep import for potential use, though not strictly needed here if we rely on globals.
// Sonner import removed

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nova Fit Check-In',
  description: 'Sistema de control de asistencia para gimnasio Nova Fit',
  manifest: '/manifest.json', // PWA ready
  themeColor: '#0f172a',
  applicationName: 'Nova Fit',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nova Fit',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground selection:bg-primary selection:text-white antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <SyncWorker />
          <Header />
          <main className="flex-1 container mx-auto py-6 md:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
