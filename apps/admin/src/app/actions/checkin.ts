'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { getMembers } from '@novafit/supabase/src/queries/members'
import { processCheckIn } from '@novafit/supabase/src/queries/checkin'

export async function manualCheckinAction(query: string, specificMemberId?: string) {
  const supabase = await createServerClient()

  try {
    let targetMemberId = specificMemberId

    // If no specific member selected, we search
    if (!targetMemberId) {
      const { members } = await getMembers(supabase, { search: query, limit: 10 })
      
      if (members.length === 0) {
        return { type: 'error', message: 'No se encontró ningún miembro con esa información.' }
      }

      // If multiple members, return them to the UI so the user can select
      if (members.length > 1) {
        // Check if there is an EXACT match for username or phone
        const exactMatch = members.find(m => m.username === query.toUpperCase() || m.phone === query)
        if (exactMatch) {
          targetMemberId = exactMatch.member_id
        } else {
          return { 
            type: 'needs_selection', 
            members: members.map(m => ({ id: m.member_id, name: m.nombre, username: m.username, phone: (m as any).telefono, status: m.status })) 
          }
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
    
    // Process checkin
    const result = await processCheckIn(supabase, targetMemberId)

    return {
      type: 'success',
      member: { nombre: member.nombre },
      balance_after: result.visitsRemaining,
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
    const { members } = await getMembers(supabase, { search: query, limit: 10 })
    const { getAppDate } = await import('@novafit/supabase/src/utils/date')
    const today = getAppDate()

    return members
      .filter(m => m.status === 'active' || m.status === 'low_balance')
      .filter(m => {
        if (!m.active_plan) return false
        if (m.active_plan.starts_at && new Date(m.active_plan.starts_at) > today) return false
        return true
      })
      .map(m => ({
        id: m.member_id,
        name: m.nombre,
        username: m.username,
        phone: (m as any).telefono,
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
