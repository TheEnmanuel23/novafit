'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentStaff, hasRole } from '@novafit/supabase'

async function checkPermission(supabase: any) {
  const staff = await getCurrentStaff(supabase)
  if (!staff || !(await hasRole(staff, 'manage_members'))) {
    throw new Error('Unauthorized')
  }
}

export async function createPlan(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  try {
    await checkPermission(supabase)
    
    const description = formData.get('description') as string
    const visits_included = parseInt(formData.get('visits_included') as string, 10)
    const price = parseInt(formData.get('price') as string, 10)
    const max_balance = parseInt(formData.get('max_balance') as string, 10)
    const expiration_days = parseInt(formData.get('expiration_days') as string, 10)
    const key = (formData.get('key') as string) || 'custom'
    const active = formData.get('active') === 'on'

    if (!description || isNaN(visits_included) || isNaN(price) || isNaN(max_balance) || isNaN(expiration_days)) {
      return { error: 'Todos los campos numéricos deben ser válidos y la descripción es obligatoria.' }
    }

    const { error } = await supabase.from('plans').insert({
      description,
      visits_included,
      price,
      max_balance,
      expiration_days,
      key,
      active
    })

    if (error) {
      return { error: 'Error al crear el plan: ' + error.message }
    }

  } catch (error: any) {
    return { error: error.message || 'Error inesperado.' }
  }

  revalidatePath('/plans')
  revalidatePath('/members/new')
  redirect('/plans')
}

export async function updatePlan(id: string, prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  try {
    await checkPermission(supabase)
    
    const description = formData.get('description') as string
    const visits_included = parseInt(formData.get('visits_included') as string, 10)
    const price = parseInt(formData.get('price') as string, 10)
    const max_balance = parseInt(formData.get('max_balance') as string, 10)
    const expiration_days = parseInt(formData.get('expiration_days') as string, 10)
    const key = (formData.get('key') as string) || 'custom'
    const active = formData.get('active') === 'on'

    if (!description || isNaN(visits_included) || isNaN(price) || isNaN(max_balance) || isNaN(expiration_days)) {
      return { error: 'Todos los campos numéricos deben ser válidos y la descripción es obligatoria.' }
    }

    const { error } = await supabase.from('plans').update({
      description,
      visits_included,
      price,
      max_balance,
      expiration_days,
      key,
      active
    }).eq('id', id)

    if (error) {
      return { error: 'Error al actualizar el plan: ' + error.message }
    }

  } catch (error: any) {
    return { error: error.message || 'Error inesperado.' }
  }

  revalidatePath('/plans')
  revalidatePath('/members/new')
  redirect('/plans')
}

export async function togglePlanStatus(id: string, active: boolean) {
  const supabase = await createServerClient()
  
  try {
    await checkPermission(supabase)
    
    const { error } = await supabase
      .from('plans')
      .update({ active })
      .eq('id', id)

    if (error) {
      return { error: 'Error al cambiar estado: ' + error.message }
    }

  } catch (error: any) {
    return { error: error.message || 'Error inesperado.' }
  }

  revalidatePath('/plans')
  revalidatePath('/members/new')
  return { success: true }
}
