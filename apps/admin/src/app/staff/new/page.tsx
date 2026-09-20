import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfiles, getCurrentStaff, hasRole } from '@novafit/supabase'
import StaffForm from './StaffForm'

export default async function NewStaffPage() {
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_staff'))) {
    redirect('/dashboard')
  }

  // Fetch available profiles
  const profiles = await getProfiles(supabase)

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/staff" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo Staff</h1>
          <p className="text-muted-foreground text-xs">Crear cuenta y asignar permisos</p>
        </div>
      </header>

      <main className="page-content mt-6 max-w-md mx-auto w-full">
        <StaffForm profiles={profiles} />
      </main>
    </div>
  )
}
