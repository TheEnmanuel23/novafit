import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffList, getCurrentStaff, hasRole } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'
import { StaffListClient } from './StaffListClient'

export default async function StaffPage() {
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_staff'))) {
    redirect('/dashboard')
  }

  const staffList = await getStaffList(supabase, { includeDeleted: true })
  const activeCount = staffList.filter((s) => !s.deleted && s.is_active !== false).length

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} activos • {staffList.length} en total
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
        <StaffListClient staffList={staffList} />
      </main>
      
      <BottomNav currentPath="/staff" />
    </div>
  )
}
