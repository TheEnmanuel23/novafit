
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users } from 'lucide-react';

import { useAuthStore } from '@/lib/store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const Header = () => {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch on initial load

  // Only show header on /admin AND if authenticated
  if (!pathname?.startsWith('/admin') || !isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <img src="/logo.png" alt="Nova Fit" className="h-16 w-auto rounded-2xl" />
        </Link>
        {!isOnline && (
          <div className="ml-4 flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 border border-red-500/20">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            OFFLINE
          </div>
        )}
        
        <nav className="flex flex-1 items-center justify-end gap-6">
          <Link 
            href="/" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Check-In</span>
          </Link>
          <Link 
            href="/admin" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Users className="h-5 w-5" />
            <span className="hidden sm:inline">Administrar</span>
          </Link>
        </nav>


      </div>
    </header>
  );
};
