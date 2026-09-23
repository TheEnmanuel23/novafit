'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { generateUniqueUsername, createMember } from '@novafit/supabase/src/queries/members'

export async function registerMember(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      throw new Error('No tienes permisos para registrar miembros.')
    }
    
    const nombre = formData.get('nombre') as string
    const telefono = formData.get('telefono') as string
    const planId = formData.get('plan_id') as string
    
    // Custom overrides
    const startsAtStr = formData.get('starts_at') as string
    const customVisits = parseInt(formData.get('custom_visits') as string, 10)
    const customDays = parseInt(formData.get('custom_days') as string, 10)
    const customPrice = parseInt(formData.get('custom_price') as string, 10)
    
    if (!nombre || !planId) {
      return { error: 'Nombre y plan son requeridos.' }
    }
    
    if (isNaN(customVisits) || isNaN(customDays) || isNaN(customPrice)) {
      return { error: 'Los valores personalizados del plan deben ser números válidos.' }
    }

    // 1. Calculate dates
    const startsAt = new Date(startsAtStr)
    if (isNaN(startsAt.getTime())) {
      return { error: 'Fecha de inicio inválida.' }
    }
    
    const expirationDate = new Date(startsAt)
    // Add calendar days (including Sundays)
    expirationDate.setDate(expirationDate.getDate() + customDays)

    // 2. Generate Username and QR code
    const username = await generateUniqueUsername(supabase)
    const qrCode = `NOVA-${username}` // Simplistic QR generation for now
    
    // 3. Create Member
    const member = await createMember(supabase, {
      nombre,
      telefono,
      username,
      qr_code: qrCode
    })

    // 4. Create member_plans record with custom values and starts_at
    const { data: memberPlan, error: mpError } = await supabase
      .from('member_plans')
      .insert({
        member_id: member.member_id,
        plan_id: planId,
        starts_at: startsAt.toISOString(),
        expiration_date: expirationDate.toISOString(),
        visits_purchased: customVisits,
        visits_used: 0,
        status: 'active'
      })
      .select()
      .single()

    if (mpError) throw new Error(`Error asignando plan: ${mpError.message}`)

    // 5. Log Transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        member_id: member.member_id,
        member_plan_id: memberPlan.id,
        plan_id: planId,
        visits_added: customVisits,
        balance_before: 0,
        balance_after: customVisits,
        amount_paid: customPrice,
        registered_by: staff.id
      })

    if (txError) throw new Error(`Error registrando pago: ${txError.message}`)

  } catch (error: any) {
    return { error: error.message || 'Error inesperado al registrar.' }
  }

  // Redirect to members list
  redirect('/members')
}
