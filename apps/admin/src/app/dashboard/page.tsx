import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)
  
  const canManageMembers = staff ? await hasRole(staff, 'manage_members') : false

  return (
    <div className="app-container">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {staff ? `Hola, ${staff.nombre}` : 'Resumen de hoy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/update-password" title="Cambiar contraseña" aria-label="Cambiar contraseña" className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center hover-lift">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </Link>
          <form action={signOut}>
            <button type="submit" className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover-lift" aria-label="Cerrar sesión" title="Cerrar sesión">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </form>
        </div>
      </header>

      <main className="page-content mt-6 flex flex-col gap-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-5 flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">
              Visitas Hoy
            </span>
            <span className="text-3xl font-black">0</span>
          </div>
          <div className="glass p-5 flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">
              Ingresos Hoy
            </span>
            <span className="text-3xl font-black text-success">C$ 0</span>
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="section-title">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 gap-4">
            {canManageMembers && (
              <Link href="/members/new" className="glass p-4 text-center hover-lift flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-accent-subtle text-accent flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                </div>
                <span className="text-sm font-semibold">Nuevo Miembro</span>
              </Link>
            )}
            
            <Link href="/checkin" className="glass p-4 text-center hover-lift flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-success-subtle text-success flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="5" height="5" x="7" y="7"/><rect width="5" height="5" x="12" y="12"/></svg>
              </div>
              <span className="text-sm font-semibold">Modo Kiosco</span>
            </Link>
          </div>
        </section>

      </main>
      
      <BottomNav currentPath="/dashboard" />
    </div>
  )
}
