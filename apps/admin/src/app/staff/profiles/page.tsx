import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfilesWithRoles, getCurrentStaff, isGlobalAdmin } from '@novafit/supabase'

export default async function ProfilesPage() {
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await isGlobalAdmin(currentUser))) {
    redirect('/staff')
  }

  const profiles = await getProfilesWithRoles(supabase)

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/staff" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Perfiles de Staff</h1>
          <p className="text-muted-foreground text-xs">Administra los roles y permisos</p>
        </div>
        <Link href="/staff/profiles/new" className="btn btn-primary btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Crear
        </Link>
      </header>

      <main className="page-content mt-6 flex flex-col gap-3">
        {profiles.map((profile) => (
          <Link key={profile.id} href={`/staff/profiles/${profile.id}`} className="glass p-4 flex flex-col gap-2 hover-lift group">
            <div className="flex justify-between items-start">
              <div className="font-semibold group-hover:text-accent transition-colors">{profile.name}</div>
              {profile.is_system && <span className="badge bg-destructive/10 text-destructive text-[10px]">Sistema</span>}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-1">{profile.description || 'Sin descripción'}</p>
            
            <div className="text-xs text-accent mt-1 font-medium">
              {profile.roles.length} permisos asignados
            </div>
          </Link>
        ))}

        {profiles.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            No hay perfiles configurados.
          </div>
        )}
      </main>
    </div>
  )
}
