import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)

  // Allow entry if the user has any checkin-related permission
  const canCheckin = isGlobal
    || await hasRole(staff, 'process_checkin')
    || await hasRole(staff, 'checkin_qr')
    || await hasRole(staff, 'checkin_manual')
    || await hasRole(staff, 'manage_members')

  if (!canCheckin) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
