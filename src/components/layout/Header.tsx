
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users } from 'lucide-react';

import { useAuthStore } from '@/lib/store';

export const Header = () => {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by defining initial visibility or just returning null until mounted if critical.
  // But here we want to HIDE by default on '/' unless we know for sure we are auth'd.
  // Actually, standard behavior:
  if (!mounted) return null; // Avoid hydration mismatch on initial load

  if (pathname === '/' && !isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <img src="/logo.png" alt="Nova Fit" className="h-16 w-auto rounded-2xl" />
        </Link>
        
        <nav className="flex items-center gap-6">
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
