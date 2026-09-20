import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'

export async function BottomNav({ currentPath }: { currentPath: string }) {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) return null

  const canManageMembers = await hasRole(staff, 'manage_members')
  const canManageStaff = await hasRole(staff, 'manage_staff')

  return (
    <nav className="bottom-nav">
      <Link href="/dashboard" className={`bottom-nav-item ${currentPath.startsWith('/dashboard') ? 'active' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        Panel
      </Link>
      
      {canManageMembers && (
        <Link href="/members" className={`bottom-nav-item ${currentPath.startsWith('/members') ? 'active' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Miembros
        </Link>
      )}

      {canManageStaff && (
        <Link href="/staff" className={`bottom-nav-item ${currentPath.startsWith('/staff') ? 'active' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Staff
        </Link>
      )}
    </nav>
  )
}
