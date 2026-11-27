'use server'

import { createServiceClient, createServerClient } from '@novafit/supabase/src/server'
import { revalidatePath } from 'next/cache'

export async function createStaffAccount(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const username = formData.get('username') as string
  console.info(`[StaffAction:createStaffAccount] Attempting to create staff account for ${username}`)
  const profile_id = formData.get('profile_id') as string

  if (!name || !username || !profile_id) {
    console.warn(`[StaffAction:createStaffAccount] Missing fields`)
    return { error: 'Por favor, complete todos los campos requeridos.' }
  }

  // Format username: lowercase, no spaces
  const cleanUsername = username.toLowerCase().replace(/\s+/g, '')
  const dummyEmail = `${cleanUsername}@staff.novafit.local`

  const supabase = await createServerClient()
  
  // 1. Verify the current user is a Global Admin
  const { data: isGlobalAdmin, error: rpcError } = await supabase.rpc('is_global_admin')
  
  if (rpcError || !isGlobalAdmin) {
    console.warn(`[StaffAction:createStaffAccount] Unauthorized access attempt: Not a Global Admin`)
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
    console.error('[StaffAction:createStaffAccount] Auth Error:', authError)
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
      auth_user_id: authUser.user.id, name,
      username: cleanUsername,
      profile_id,
    })

  if (staffError) {
    console.error('[StaffAction:createStaffAccount] Staff Insert Error:', staffError)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Error al crear el perfil de empleado.' }
  }

  revalidatePath('/dashboard/staff')

  console.info(`[StaffAction:createStaffAccount] Successfully created staff account for ${cleanUsername}`)

  return { 
    success: true, 
    message: 'Cuenta creada exitosamente',
    temporaryPassword 
  }
}

export async function updateStaffProfile(prevState: any, formData: FormData) {
  const staffId = formData.get('staff_id') as string
  const profileId = formData.get('profile_id') as string
  console.info(`[StaffAction:updateStaffProfile] Attempting to update staff ${staffId} to profile ${profileId}`)

  if (!staffId || !profileId) {
    console.warn(`[StaffAction:updateStaffProfile] Missing fields`)
    return { error: 'Faltan datos requeridos.' }
  }

  const supabase = await createServerClient()
  const { data: isGlobalAdmin } = await supabase.rpc('is_global_admin')
  
  if (!isGlobalAdmin) {
    console.warn(`[StaffAction:updateStaffProfile] Unauthorized access attempt: Not a Global Admin`)
    return { error: 'Acceso denegado.' }
  }

  const supabaseAdmin = createServiceClient()

  // Prevent modifying another Global Admin
  const { data: targetStaff } = await supabaseAdmin
    .from('staff')
    .select(`profile:profiles(name)`)
    .eq('id', staffId)
    .single()

  if ((targetStaff?.profile as any)?.name === 'Global Admin') {
    console.warn(`[StaffAction:updateStaffProfile] Attempted to modify Global Admin`)
    return { error: 'No se puede modificar el nivel de acceso de un administrador global.' }
  }

  const { error } = await supabaseAdmin
    .from('staff')
    .update({ profile_id: profileId })
    .eq('id', staffId)

  if (error) {
    console.error(`[StaffAction:updateStaffProfile] Error updating staff profile:`, error)
    return { error: 'Error al actualizar el staff.' }
  }

  revalidatePath(`/staff/${staffId}`)
  console.info(`[StaffAction:updateStaffProfile] Successfully updated staff profile`)
  return { success: true }
}

export async function resetStaffPassword(staffId: string) {
  console.info(`[StaffAction:resetStaffPassword] Attempting to reset password for staff ${staffId}`)
  const supabase = await createServerClient()
  const { data: isGlobalAdmin } = await supabase.rpc('is_global_admin')
  
  if (!isGlobalAdmin) {
    console.warn(`[StaffAction:resetStaffPassword] Unauthorized access attempt: Not a Global Admin`)
    return { error: 'Acceso denegado.' }
  }

  const supabaseAdmin = createServiceClient()

  const { data: targetStaff, error: fetchError } = await supabaseAdmin
    .from('staff')
    .select('auth_user_id')
    .eq('id', staffId)
    .single()

  if (fetchError || !targetStaff) {
    console.warn(`[StaffAction:resetStaffPassword] Staff not found: ${staffId}`)
    return { error: 'No se encontró al empleado.' }
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let newPassword = ''
  for (let i = 0; i < 12; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetStaff.auth_user_id,
    { password: newPassword }
  )

  if (updateError) {
    console.error('[StaffAction:resetStaffPassword] Password Reset Error:', updateError)
    return { error: 'Error al restablecer la contraseña en autenticación.' }
  }

  console.info(`[StaffAction:resetStaffPassword] Password reset successful for staff ${staffId}`)
  return { success: true, newPassword }
}

export async function toggleStaffActiveStatus(staffId: string, nextIsActive: boolean) {
  console.info(
    `[StaffAction:toggleStaffActiveStatus] Setting staff ${staffId} is_active=${nextIsActive}`
  )
  const supabase = await createServerClient()
  const { data: isGlobalAdmin } = await supabase.rpc('is_global_admin')

  if (!isGlobalAdmin) {
    return { error: 'Acceso denegado. Solo un Administrador Global puede realizar esta acción.' }
  }

  const {
    data: { user: currentAuthUser },
  } = await supabase.auth.getUser()

  const supabaseAdmin = createServiceClient()

  const { data: targetStaff, error: fetchError } = await supabaseAdmin
    .from('staff')
    .select('id, auth_user_id, name, profile:profiles(name)')
    .eq('id', staffId)
    .eq('deleted', false)
    .single()

  if (fetchError || !targetStaff) {
    return { error: 'No se encontró al empleado.' }
  }

  if (currentAuthUser && targetStaff.auth_user_id === currentAuthUser.id) {
    return { error: 'No puedes desactivar tu propia cuenta.' }
  }

  const targetProfile = targetStaff.profile as { name?: string } | { name?: string }[] | null
  const targetProfileName = Array.isArray(targetProfile)
    ? targetProfile[0]?.name
    : targetProfile?.name

  if (targetProfileName === 'Global Admin') {
    return { error: 'No se puede desactivar a un Administrador Global.' }
  }

  // 1. Update staff.is_active (and clear online indicator when deactivating)
  const updatePayload: { is_active: boolean; is_online?: boolean } = {
    is_active: nextIsActive,
  }
  if (!nextIsActive) {
    updatePayload.is_online = false
  }

  const { error: updateStaffError } = await supabaseAdmin
    .from('staff')
    .update(updatePayload)
    .eq('id', staffId)

  if (updateStaffError) {
    console.error('[StaffAction:toggleStaffActiveStatus] Staff update error:', updateStaffError)
    return { error: 'Error al actualizar el estado del empleado.' }
  }

  // 2. Ban or unban the Supabase Auth account so login & token refresh are blocked at the Auth layer
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
    targetStaff.auth_user_id,
    { ban_duration: nextIsActive ? 'none' : '876000h' }
  )

  if (banError) {
    console.error('[StaffAction:toggleStaffActiveStatus] Auth ban/unban error:', banError)
    // Roll back staff.is_active so DB and Auth stay in sync
    await supabaseAdmin
      .from('staff')
      .update({ is_active: !nextIsActive })
      .eq('id', staffId)
    return { error: 'Error al actualizar el acceso de autenticación del empleado.' }
  }

  // 3. When deactivating, revoke all active sessions globally & log forced logout
  if (!nextIsActive) {
    try {
      const adminAuth = supabaseAdmin.auth.admin as unknown as {
        signOut?: (jwtOrUserId: string, scope?: 'global' | 'local' | 'others') => Promise<unknown>
      }
      if (typeof adminAuth.signOut === 'function') {
        await adminAuth.signOut(targetStaff.auth_user_id, 'global')
      }
    } catch (err) {
      // Ban + middleware active check still enforce immediate lockout on next request
      console.warn('[StaffAction:toggleStaffActiveStatus] Global signOut warning:', err)
    }

    try {
      await supabaseAdmin.from('user_sessions').insert({
        auth_user_id: targetStaff.auth_user_id,
        user_type: 'staff',
        action: 'logout',
      })
    } catch {
      // Non-blocking audit log
    }
  }

  revalidatePath('/staff')
  revalidatePath(`/staff/${staffId}`)

  return { success: true, is_active: nextIsActive }
}
