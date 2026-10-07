'use server'
import { getAppDate } from '@novafit/supabase/src/utils/date';

import { createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { generateUniqueUsername, createMember, updateMemberDetails, softDeleteMember } from '@novafit/supabase/src/queries/members'

export async function registerMember(prevState: any, formData: FormData) {
  console.info(`[MembersAction:registerMember] Starting registration`)
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      console.warn(`[MembersAction:registerMember] Unauthorized access attempt`)
      throw new Error('No tienes permisos para registrar miembros.')
    }
    
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const planId = formData.get('plan_id') as string
    
    // Custom overrides
    const startsAtStr = formData.get('starts_at') as string
    const customVisits = parseInt(formData.get('custom_visits') as string, 10)
    const customVisitsUsed = parseInt(formData.get('custom_visits_used') as string, 10) || 0
    const customDays = parseInt(formData.get('custom_days') as string, 10)
    const customPrice = parseInt(formData.get('custom_price') as string, 10)
    
    if (!name || !planId) {
      return { error: 'Nombre y plan son requeridos.' }
    }
    
    if (isNaN(customVisits) || isNaN(customDays) || isNaN(customPrice)) {
      return { error: 'Los valores personalizados del plan deben ser números válidos.' }
    }

    // 1. Calculate dates in UTC
    const startsAt = new Date(`${startsAtStr}T00:00:00Z`)
    
    if (isNaN(startsAt.getTime())) {
      return { error: 'Fecha de inicio inválida.' }
    }
    
    const expirationDate = new Date(startsAt)
    // Add calendar days
    expirationDate.setDate(expirationDate.getDate() + customDays)
    expirationDate.setHours(23, 59, 59, 999)

    // 2. Generate Username and QR code
    const username = await generateUniqueUsername(supabase)
    const qrCode = `NOVA-${username}` // Simplistic QR generation for now
    
    // 3. Create Member
    const member = await createMember(supabase, { name, phone,
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
        visits_used: customVisitsUsed,
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
        balance_after: customVisits - customVisitsUsed,
        amount_paid: customPrice,
        registered_by: staff.id
      })

    if (txError) throw new Error(`Error registrando pago: ${txError.message}`)

    const registerVisit = formData.get('register_visit') === 'on'
    if (registerVisit) {
      console.info(`[MembersAction:registerMember] Auto-registering visit for ${member.member_id}`)
      const { processCheckIn } = await import('@novafit/supabase/src/queries/checkin')
      await processCheckIn(supabase, { type: 'member_id', value: member.member_id }, { staff, checkinType: 'auto_assignment' })
    }

    console.info(`[MembersAction:registerMember] Successfully registered member: ${member.member_id}`)
  } catch (error: any) {
    console.error(`[MembersAction:registerMember] Error:`, error)
    return { error: error.message || 'Error inesperado al registrar.' }
  }

  // Redirect to members list
  redirect('/members')
}

export async function updateMemberAction(prevState: any, formData: FormData) {
  const memberId = formData.get('member_id') as string
  console.info(`[MembersAction:updateMemberAction] Attempting to update member: ${memberId}`)
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      console.warn(`[MembersAction:updateMemberAction] Unauthorized access attempt`)
      throw new Error('No tienes permisos para editar miembros.')
    }
    
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    
    if (!memberId || !name) {
      return { error: 'ID y Nombre son requeridos.' }
    }
    
    await updateMemberDetails(
      supabase,
      memberId,
      { name, phone},
      staff.id
    )
    console.info(`[MembersAction:updateMemberAction] Successfully updated member: ${memberId}`)

  } catch (error: any) {
    console.error(`[MembersAction:updateMemberAction] Error:`, error)
    return { error: error.message || 'Error inesperado al actualizar el miembro.' }
  }

  // The caller can use the success state or we just let it finish.
  // Revalidate the member's detail page
  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
  return { success: true }
}

export async function deactivateMemberAction(memberId: string) {
  console.info(`[MembersAction:deactivateMemberAction] Deactivating member: ${memberId}`)
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      console.warn(`[MembersAction:deactivateMemberAction] Unauthorized access attempt`)
      throw new Error('No tienes permisos para desactivar miembros.')
    }
    
    await softDeleteMember(supabase, memberId, staff.id)
    console.info(`[MembersAction:deactivateMemberAction] Successfully deactivated member: ${memberId}`)

  } catch (error: any) {
    console.error(`[MembersAction:deactivateMemberAction] Error:`, error)
    throw new Error(error.message || 'Error inesperado al desactivar el miembro.')
  }

  revalidatePath('/members')
  redirect('/members')
}

export async function assignPlanAction(prevState: any, formData: FormData) {
  const memberId = formData.get('member_id') as string
  const planId = formData.get('plan_id') as string
  console.info(`[MembersAction:assignPlanAction] Assigning plan ${planId} to member ${memberId}`)
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      console.warn(`[MembersAction:assignPlanAction] Unauthorized access attempt`)
      throw new Error('No tienes permisos para asignar planes.')
    }
    
    const planId = formData.get('plan_id') as string
    const customPrice = parseInt(formData.get('custom_price') as string, 10)
    const customVisits = parseInt(formData.get('custom_visits') as string, 10)
    const customVisitsUsed = parseInt(formData.get('custom_visits_used') as string, 10) || 0
    const customDays = parseInt(formData.get('custom_days') as string, 10)
    const startsAtStr = formData.get('starts_at') as string
    
    if (!memberId || !planId) {
      return { error: 'Miembro y Plan son requeridos.' }
    }
    
    let startsAt: Date | undefined
    if (startsAtStr) {
      startsAt = new Date(`${startsAtStr}T00:00:00Z`)
    }
    
    const { processRecharge } = await import('@novafit/supabase/src/queries/member-plans')
    
    await processRecharge(supabase, {
      memberId,
      planId,
      amountPaid: isNaN(customPrice) ? 0 : customPrice,
      registeredBy: staff.id,
      startsAt,
      customVisits: isNaN(customVisits) ? undefined : customVisits,
      customVisitsUsed,
      customDays: isNaN(customDays) ? undefined : customDays
    })

    const registerVisit = formData.get('register_visit') === 'on'
    if (registerVisit) {
      console.info(`[MembersAction:assignPlanAction] Auto-registering visit for ${memberId}`)
      const { processCheckIn } = await import('@novafit/supabase/src/queries/checkin')
      await processCheckIn(supabase, { type: 'member_id', value: memberId }, { staff, checkinType: 'auto_assignment' })
    }
    console.info(`[MembersAction:assignPlanAction] Successfully assigned plan`)

  } catch (error: any) {
    console.error(`[MembersAction:assignPlanAction] Error:`, error)
    return { error: error.message || 'Error inesperado al asignar el plan.' }
  }

  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
  return { success: true }
}

export async function updatePlanAction(prevState: any, formData: FormData) {
  const planId = formData.get('plan_id') as string
  const memberId = formData.get('member_id') as string
  console.info(`[MembersAction:updatePlanAction] Updating plan ${planId} for member ${memberId}`)
  const supabase = await createServerClient()
  
  try {
    const staff = await getCurrentStaff(supabase)
    if (!staff || !(await hasRole(staff, 'manage_members'))) {
      console.warn(`[MembersAction:updatePlanAction] Unauthorized access attempt`)
      throw new Error('No tienes permisos para editar planes.')
    }
    
    const planId = formData.get('plan_id') as string
    const visitsPurchased = parseInt(formData.get('visits_purchased') as string, 10)
    const visitsUsed = parseInt(formData.get('visits_used') as string, 10)
    const startsAtStr = formData.get('starts_at') as string
    const expiresAtStr = formData.get('expiration_date') as string
    const status = formData.get('status') as string
    
    if (!planId || !memberId) {
      return { error: 'ID de plan y miembro son requeridos.' }
    }
    
    let startsAtISO: string | undefined
    if (startsAtStr) {
      startsAtISO = new Date(`${startsAtStr}T00:00:00Z`).toISOString()
    }

    let expiresAtISO: string | undefined
    if (expiresAtStr) {
      expiresAtISO = new Date(`${expiresAtStr}T23:59:59.999Z`).toISOString()
    }
    
    const appDate = await getAppDate();
    
    const { error } = await supabase
      .from('member_plans')
      .update({
        visits_purchased: isNaN(visitsPurchased) ? undefined : visitsPurchased,
        visits_used: isNaN(visitsUsed) ? undefined : visitsUsed,
        starts_at: startsAtISO,
        expiration_date: expiresAtISO,
        status: status === 'active' || status === 'expired' ? status : undefined,
        updated_at: appDate.toISOString()
      })
      .eq('id', planId)
      
    if (error) throw new Error(error.message)
    console.info(`[MembersAction:updatePlanAction] Successfully updated plan ${planId}`)

  } catch (error: any) {
    console.error(`[MembersAction:updatePlanAction] Error:`, error)
    return { error: error.message || 'Error inesperado al editar el plan.' }
  }

  revalidatePath(`/members/${memberId}`)
  return { success: true }
}
