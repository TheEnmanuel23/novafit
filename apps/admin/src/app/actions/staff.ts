'use server'

import { createServiceClient, createServerClient } from '@novafit/supabase/src/server'
import { revalidatePath } from 'next/cache'

export async function createStaffAccount(prevState: any, formData: FormData) {
  const nombre = formData.get('nombre') as string
  const username = formData.get('username') as string
  const profile_id = formData.get('profile_id') as string

  if (!nombre || !username || !profile_id) {
    return { error: 'Por favor, complete todos los campos requeridos.' }
  }

  // Format username: lowercase, no spaces
  const cleanUsername = username.toLowerCase().replace(/\s+/g, '')
  const dummyEmail = `${cleanUsername}@staff.novafit.local`

  const supabase = await createServerClient()
  
  // 1. Verify the current user is a Global Admin
  const { data: isGlobalAdmin, error: rpcError } = await supabase.rpc('is_global_admin')
  
  if (rpcError || !isGlobalAdmin) {
    return { error: 'No tienes permisos suficientes para realizar esta acción.' }
  }

  const supabaseAdmin = createServiceClient()

  // 2. Generate a random secure password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let temporaryPassword = ''
  for (let i = 0; i < 12; i++) {
    temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // 3. Create Auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: dummyEmail,
    password: temporaryPassword,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    console.error('Auth Error:', authError)
    // Attempt to parse standard Supabase errors
    if (authError?.message?.includes('already registered')) {
      return { error: 'El nombre de usuario ya está registrado.' }
    }
    return { error: 'Error al crear la cuenta de autenticación.' }
  }

  // 4. Create Staff record
  const { error: staffError } = await supabaseAdmin
    .from('staff')
    .insert({
      auth_user_id: authUser.user.id,
      nombre,
      username: cleanUsername,
      profile_id,
    })

  if (staffError) {
    console.error('Staff Insert Error:', staffError)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Error al crear el perfil de empleado.' }
  }

  revalidatePath('/dashboard/staff')

  return { 
    success: true, 
    message: 'Cuenta creada exitosamente',
    temporaryPassword 
  }
}

export async function updateStaffProfile(prevState: any, formData: FormData) {
  const staffId = formData.get('staff_id') as string
  const profileId = formData.get('profile_id') as string

  if (!staffId || !profileId) return { error: 'Faltan datos requeridos.' }

  const supabase = await createServerClient()
  const { data: isGlobalAdmin } = await supabase.rpc('is_global_admin')
  
  if (!isGlobalAdmin) return { error: 'Acceso denegado.' }

  const supabaseAdmin = createServiceClient()

  // Prevent modifying another Global Admin
  const { data: targetStaff } = await supabaseAdmin
    .from('staff')
    .select(`profile:profiles(name)`)
    .eq('id', staffId)
    .single()

  if ((targetStaff?.profile as any)?.name === 'Global Admin') {
    return { error: 'No se puede modificar el nivel de acceso de un administrador global.' }
  }

  const { error } = await supabaseAdmin
    .from('staff')
    .update({ profile_id: profileId })
    .eq('id', staffId)

  if (error) return { error: 'Error al actualizar el staff.' }

  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}
