import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffList, getStaffCount, getCurrentStaff, hasRole } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'

export default async function StaffPage() {
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_staff'))) {
    redirect('/dashboard')
  }

  const staffList = await getStaffList(supabase)
  const total = await getStaffCount(supabase)

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} registrados
          </p>
        </div>
        <div className="flex gap-2">
          {await hasRole(currentUser, 'manage_staff') && (
            <Link href="/staff/profiles" className="btn bg-surface hover:bg-surface-hover text-foreground border border-border">
              Perfiles
            </Link>
          )}
          <Link href="/staff/new" className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nuevo
          </Link>
        </div>
      </header>

      <main className="page-content mt-6">
        <div className="glass p-2 mb-6 flex gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" className="input pl-9 border-none bg-transparent h-10 w-full focus:ring-0 shadow-none" placeholder="Buscar por nombre o usuario..." />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {staffList.map((staff) => (
            <Link key={staff.id} href={`/staff/${staff.id}`} className="glass p-4 flex justify-between items-center hover-lift group">
              <div>
                <div className="font-semibold group-hover:text-accent transition-colors">{staff.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{staff.username}</div>
              </div>
              <div className="text-right">
                <span className="badge badge-active">{staff.profile.name}</span>
                <div className="text-sm text-muted-foreground mt-1">
                  {staff.email}
                </div>
              </div>
            </Link>
          ))}
          
          {staffList.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No hay staff registrados aún.
            </div>
          )}
        </div>
      </main>
      
      <BottomNav currentPath="/staff" />
    </div>
  )
}
