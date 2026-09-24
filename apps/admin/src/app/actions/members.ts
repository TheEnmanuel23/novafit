'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { generateUniqueUsername, createMember, updateMemberDetails, softDeleteMember } from '@novafit/supabase/src/queries/members'

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

    // 1. Calculate dates (avoid timezone parsing issues by parsing manually)
    const [year, month, day] = startsAtStr.split('-').map(Number)
    const startsAt = new Date(year, month - 1, day)
    
    if (isNaN(startsAt.getTime())) {
      return { error: 'Fecha de inicio inválida.' }
    }
    
    const expirationDate = new Date(startsAt)
    // Add calendar days (including Sundays)
    // If a plan is for 1 day, it expires on the same day.
    expirationDate.setDate(expirationDate.getDate() + Math.max(0, customDays - 1))
    expirationDate.setHours(23, 59, 59, 999)

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

export async function updateMemberAction(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      throw new Error('No tienes permisos para editar miembros.')
    }
    
    const memberId = formData.get('member_id') as string
    const nombre = formData.get('nombre') as string
    const telefono = formData.get('telefono') as string
    
    if (!memberId || !nombre) {
      return { error: 'ID y Nombre son requeridos.' }
    }
    
    await updateMemberDetails(
      supabase,
      memberId,
      { nombre, telefono },
      staff.id
    )

  } catch (error: any) {
    return { error: error.message || 'Error inesperado al actualizar el miembro.' }
  }

  // The caller can use the success state or we just let it finish.
  // Revalidate the member's detail page
  const memberId = formData.get('member_id') as string
  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
  return { success: true }
}

export async function deactivateMemberAction(memberId: string) {
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      throw new Error('No tienes permisos para desactivar miembros.')
    }
    
    await softDeleteMember(supabase, memberId, staff.id)

  } catch (error: any) {
    throw new Error(error.message || 'Error inesperado al desactivar el miembro.')
  }

  revalidatePath('/members')
  redirect('/members')
}

export async function assignPlanAction(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      throw new Error('No tienes permisos para asignar planes.')
    }
    
    const memberId = formData.get('member_id') as string
    const planId = formData.get('plan_id') as string
    const customPrice = parseInt(formData.get('custom_price') as string, 10)
    
    if (!memberId || !planId) {
      return { error: 'Miembro y Plan son requeridos.' }
    }
    
    const { processRecharge } = await import('@novafit/supabase/src/queries/member-plans')
    
    await processRecharge(supabase, {
      memberId,
      planId,
      amountPaid: isNaN(customPrice) ? 0 : customPrice,
      registeredBy: staff.id
    })

  } catch (error: any) {
    return { error: error.message || 'Error inesperado al asignar el plan.' }
  }

  const memberId = formData.get('member_id') as string
  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
  return { success: true }
}
