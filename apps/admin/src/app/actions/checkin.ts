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
  console.info('[CheckinAction:authorizeManualCheckin] Starting authorization check');
  const authClient = await createServerClient()
  const staff = await getCurrentStaff(authClient)
  if (!staff) {
    console.warn('[CheckinAction:authorizeManualCheckin] No staff found, returning error');
    return { staff: null, error: 'Sesión no válida. Inicia sesión nuevamente.' } as const
  }
  console.info('[CheckinAction:authorizeManualCheckin] Staff found:', { id: staff.id, name: staff.name, profileName: staff.profile?.name });

  const hasGlobalAdmin = await isGlobalAdmin(staff);
  const hasProcessCheckin = await hasRole(staff, 'process_checkin');
  const hasCheckinManual = await hasRole(staff, 'checkin_manual');
  const hasManageMembers = await hasRole(staff, 'manage_members');
  
  console.info('[CheckinAction:authorizeManualCheckin] Role checks:', { hasGlobalAdmin, hasProcessCheckin, hasCheckinManual, hasManageMembers });

  const canManualCheckin =
    hasGlobalAdmin ||
    hasProcessCheckin ||
    hasCheckinManual ||
    hasManageMembers;

  if (!canManualCheckin) {
    console.warn('[CheckinAction:authorizeManualCheckin] Authorization failed, insufficient permissions');
    return { staff: null, error: 'No tienes permisos para registrar visitas manualmente.' } as const
  }
  console.info('[CheckinAction:authorizeManualCheckin] Authorization successful');
  return { staff, error: null } as const
}

export async function manualCheckinAction(query: string, specificMemberId?: string) {
  console.info('[CheckinAction:manualCheckinAction] Called with query:', query, 'specificMemberId:', specificMemberId);
  const { staff, error: authError } = await authorizeManualCheckin()
  if (!staff) {
    console.warn('[CheckinAction:manualCheckinAction] Authorization failed:', authError);
    return { type: 'error', message: authError }
  }

  const supabase = createServiceClient()

  try {
    let targetMemberId = specificMemberId

    // If no specific member selected, we search
    if (!targetMemberId) {
      console.info('[CheckinAction:manualCheckinAction] Searching for members with query:', query);
      let { members } = await getMembers(supabase, { search: query, limit: 50 })
      console.info('[CheckinAction:manualCheckinAction] Search found', members.length, 'members before exact filtering');
      
      const exactQuery = query.trim().toLowerCase()
      members = members.filter(m => {
        const name = m.name.toLowerCase()
        const username = m.username.toLowerCase()
        const phone = (m.phone || '').toLowerCase()
        return name === exactQuery || username === exactQuery || phone === exactQuery
      })
      console.info('[CheckinAction:manualCheckinAction] Members after exact filtering:', members.length);

      if (members.length === 0) {
        console.warn('[CheckinAction:manualCheckinAction] No exact match found');
        return { type: 'error', message: 'No se encontró ningún miembro con ese dato exacto.' }
      }

      // If multiple members have the EXACT same name/phone, return them to the UI so the user can select
      if (members.length > 1) {
        console.info('[CheckinAction:manualCheckinAction] Multiple exact matches found, returning needs_selection');
        return { 
          type: 'needs_selection', 
          members: members.map(m => ({ id: m.member_id, name: m.name, username: m.username, phone: (m as any).phone, status: m.status })) 
        }
      } else {
        targetMemberId = members[0].member_id
        console.info('[CheckinAction:manualCheckinAction] Exact match found, targetMemberId:', targetMemberId);
      }
    }

    if (!targetMemberId) {
       console.warn('[CheckinAction:manualCheckinAction] No targetMemberId identified');
       return { type: 'error', message: 'No se pudo identificar al miembro.' }
    }

    console.info('[CheckinAction:manualCheckinAction] Fetching member details for:', targetMemberId);
    // We need the member's name for the success message
    const { getMemberById } = await import('@novafit/supabase/src/queries/members')
    const member = await getMemberById(supabase, targetMemberId)

    if (!member) {
      console.warn('[CheckinAction:manualCheckinAction] Member not found in database');
      return { type: 'error', message: 'Miembro no encontrado en la base de datos.' }
    }
    
    console.info('[CheckinAction:manualCheckinAction] Processing checkin for member:', member.name);
    // Process checkin
    const result = await processCheckIn(
      supabase, 
      { type: 'member_id', value: targetMemberId },
      { staff: staff, checkinType: 'manual' }
    )

    console.info('[CheckinAction:manualCheckinAction] processCheckIn result:', result);

    if (result.type !== 'success') {
      console.warn('[CheckinAction:manualCheckinAction] checkin failed:', result.message);
      return {
        type: result.type === 'no_visits' ? 'no_visits' : 'error',
        message: result.message || 'Error al registrar la visita.',
        member: { name: member.name }
      }
    }

    console.info('[CheckinAction:manualCheckinAction] checkin successful');
    return {
      type: 'success',
      member: { name: member.name },
      balance_after: result.balance_after,
      message: 'Visita registrada correctamente'
    }

  } catch (error: any) {
    console.error('[CheckinAction:manualCheckinAction] Exception caught:', error);
    if (error.message.includes('No active plan')) {
      return { type: 'no_visits', message: 'El miembro no tiene un plan activo o visitas disponibles.' }
    }
    return { type: 'error', message: error.message || 'Ocurrió un error al registrar la visita.' }
  }
}

export async function searchMembersAction(query: string) {
  console.info('[CheckinAction:searchMembersAction] Called with query:', query);
  if (!query || query.length < 2) {
    console.info('[CheckinAction:searchMembersAction] Query too short, returning empty array');
    return []
  }

  const { staff, error: authError } = await authorizeManualCheckin()
  if (!staff) {
    console.warn('[CheckinAction:searchMembersAction] unauthorized:', authError)
    return []
  }

  try {
    const supabase = createServiceClient()
    console.info('[CheckinAction:searchMembersAction] Searching via service client');
    let { members } = await getMembers(supabase, { search: query, limit: 50 })
    console.info('[CheckinAction:searchMembersAction] Found', members.length, 'members initially');
    const { getAppDate } = await import('@novafit/supabase/src/utils/date')
    const today = getAppDate()
    
    const exactQuery = query.trim().toLowerCase()
    members = members.filter(m => {
      const name = m.name.toLowerCase()
      const username = m.username.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      return name === exactQuery || username === exactQuery || phone === exactQuery
    })
    console.info('[CheckinAction:searchMembersAction] Members after exact query filter:', members.length);

    const finalMembers = members
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
      
    console.info('[CheckinAction:searchMembersAction] Final returning members count:', finalMembers.length);
    return finalMembers;
  } catch (error) {
    console.error('[CheckinAction:searchMembersAction] failed:', error)
    return []
  }
}
