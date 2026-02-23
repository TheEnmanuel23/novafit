
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
  const user = useAuthStore((state) => state.user);
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
          <div className="flex items-center gap-4">
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
          </div>
          
          {user && (
            <div className="flex items-center gap-2 pl-4 ml-2 border-l border-white/10">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium leading-none">{user.nombre}</span>
                <span className="text-xs text-muted-foreground mt-1">Staff</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.nombre.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </nav>


      </div>
    </header>
  );
};
