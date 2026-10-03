import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import { CheckinClient } from './CheckinClient'

export default async function CheckinPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  const isGlobal = staff ? await isGlobalAdmin(staff) : false
  const hasProcessCheckin = staff ? await hasRole(staff, 'process_checkin') : false
  const hasManageMembers = staff ? await hasRole(staff, 'manage_members') : false

  // process_checkin and manage_members grant both modes; granular roles restrict to one
  const fullAccess = isGlobal || hasProcessCheckin || hasManageMembers

  const canQR = fullAccess || (staff ? await hasRole(staff, 'checkin_qr') : false)
  const canManual = fullAccess || (staff ? await hasRole(staff, 'checkin_manual') : false)

  return <CheckinClient canQR={canQR} canManual={canManual} staffName={staff?.name || 'Usuario'} />
}
