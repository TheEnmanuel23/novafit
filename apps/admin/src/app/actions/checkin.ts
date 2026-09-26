'use server'

import { createServerClient, createServiceClient } from '@novafit/supabase/src/server'
import { getMembers } from '@novafit/supabase/src/queries/members'
import { processCheckIn } from '@novafit/supabase/src/queries/checkin'
import { getCurrentStaff } from '@novafit/supabase/src/queries/staff'

export async function manualCheckinAction(query: string, specificMemberId?: string) {
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
    const { members } = await getMembers(supabase, { search: '', limit: 100 }) // This is inefficient, but we just need the name. Wait, let's just use the query if it was found, or fetch by ID.
    // Actually, getMemberById is better.
    const { getMemberById } = await import('@novafit/supabase/src/queries/members')
    const member = await getMemberById(supabase, targetMemberId)

    if (!member) {
      return { type: 'error', message: 'Miembro no encontrado en la base de datos.' }
    }
    
    // Try to get staff ID if logged in
    const authClient = await createServerClient()
    const staff = await getCurrentStaff(authClient)
    
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
  const supabase = await createServerClient()
  if (!query || query.length < 2) return []

  try {
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
    return []
  }
}
