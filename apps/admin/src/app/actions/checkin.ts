'use server'

import { createServerClient, createServiceClient } from '@novafit/supabase/src/server'
import { getMembers } from '@novafit/supabase/src/queries/members'
import { processCheckIn } from '@novafit/supabase/src/queries/checkin'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase/src/queries/staff'

/**
 * Server actions are callable directly via POST, so authorize here before
 * touching the service role client (which bypasses RLS).
 *
 * Kiosk-style staff may only hold `checkin_manual`, which the `members` /
 * `member_plans` RLS policies don't grant SELECT for, so both searching and
 * checking in must go through the service client once authorized.
 */
async function authorizeManualCheckin() {
  const authClient = await createServerClient()
  const staff = await getCurrentStaff(authClient)
  if (!staff) {
    return { staff: null, error: 'Sesión no válida. Inicia sesión nuevamente.' } as const
  }
  const canManualCheckin =
    (await isGlobalAdmin(staff)) ||
    (await hasRole(staff, 'process_checkin')) ||
    (await hasRole(staff, 'checkin_manual')) ||
    (await hasRole(staff, 'manage_members'))
  if (!canManualCheckin) {
    return { staff: null, error: 'No tienes permisos para registrar visitas manualmente.' } as const
  }
  return { staff, error: null } as const
}

export async function manualCheckinAction(query: string, specificMemberId?: string) {
  const { staff, error: authError } = await authorizeManualCheckin()
  if (!staff) {
    return { type: 'error', message: authError }
  }

  const supabase = createServiceClient()

  try {
    let targetMemberId = specificMemberId

    // If no specific member selected, we search
    if (!targetMemberId) {
      let { members } = await getMembers(supabase, { search: query, limit: 50 })
      
      const exactQuery = query.trim().toLowerCase()
      members = members.filter(m => {
        const name = m.name.toLowerCase()
        const username = m.username.toLowerCase()
        const phone = (m.phone || '').toLowerCase()
        return name === exactQuery || username === exactQuery || phone === exactQuery
      })

      if (members.length === 0) {
        return { type: 'error', message: 'No se encontró ningún miembro con ese dato exacto.' }
      }

      // If multiple members have the EXACT same name/phone, return them to the UI so the user can select
      if (members.length > 1) {
        return { 
          type: 'needs_selection', 
          members: members.map(m => ({ id: m.member_id, name: m.name, username: m.username, phone: (m as any).phone, status: m.status })) 
        }
      } else {
        targetMemberId = members[0].member_id
      }
    }

    if (!targetMemberId) {
       return { type: 'error', message: 'No se pudo identificar al miembro.' }
    }

    // We need the member's name for the success message
    const { getMemberById } = await import('@novafit/supabase/src/queries/members')
    const member = await getMemberById(supabase, targetMemberId)

    if (!member) {
      return { type: 'error', message: 'Miembro no encontrado en la base de datos.' }
    }
    
    // Process checkin
    const result = await processCheckIn(
      supabase, 
      { type: 'member_id', value: targetMemberId },
      { staff: staff, checkinType: 'manual' }
    )

    if (result.type !== 'success') {
      return {
        type: result.type === 'no_visits' ? 'no_visits' : 'error',
        message: result.message || 'Error al registrar la visita.',
        member: { name: member.name }
      }
    }

    return {
      type: 'success',
      member: { name: member.name },
      balance_after: result.balance_after,
      message: 'Visita registrada correctamente'
    }

  } catch (error: any) {
    if (error.message.includes('No active plan')) {
      return { type: 'no_visits', message: 'El miembro no tiene un plan activo o visitas disponibles.' }
    }
    return { type: 'error', message: error.message || 'Ocurrió un error al registrar la visita.' }
  }
}

export async function searchMembersAction(query: string) {
  if (!query || query.length < 2) return []

  const { staff, error: authError } = await authorizeManualCheckin()
  if (!staff) {
    console.warn('[searchMembersAction] unauthorized:', authError)
    return []
  }

  try {
    const supabase = createServiceClient()
    let { members } = await getMembers(supabase, { search: query, limit: 50 })
    const { getAppDate } = await import('@novafit/supabase/src/utils/date')
    const today = getAppDate()
    
    const exactQuery = query.trim().toLowerCase()
    members = members.filter(m => {
      const name = m.name.toLowerCase()
      const username = m.username.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      return name === exactQuery || username === exactQuery || phone === exactQuery
    })

    return members
      .filter(m => m.status === 'active' || m.status === 'low_balance')
      .filter(m => {
        if (!m.active_plan) return false
        return true
      })
      .map(m => ({
        id: m.member_id,
        name: m.name,
        username: m.username,
        phone: (m as any).phone,
        status: m.status,
        active_plan: m.active_plan ? {
          description: m.active_plan.plan?.description,
          visits_remaining: m.active_plan.visits_purchased - m.active_plan.visits_used
        } : null
      }))
  } catch (error) {
    console.error('[searchMembersAction] failed:', error)
    return []
  }
}
