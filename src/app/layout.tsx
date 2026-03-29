
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils'; // Keep import for potential use, though not strictly needed here if we rely on globals.
import { TimeTravel } from '@/components/dev/TimeTravel';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'Nova Fit Check-In',
  description: 'Sistema de control de asistencia para gimnasio Nova Fit',
  manifest: '/manifest.json', // PWA ready
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
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-background text-foreground selection:bg-primary selection:text-white antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 container mx-auto py-6 md:py-10">
            {children}
          </main>
          {process.env.NODE_ENV === 'development' && (
            <TimeTravel />
          )}
        </div>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
