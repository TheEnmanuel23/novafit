'use server'

import { createServiceClient, createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'

export async function signUpGlobalAdmin(formData: FormData) {
  const nombre = formData.get('nombre') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!nombre || !email || !password) {
    return { error: 'Por favor, complete todos los campos.' }
  }

  const supabaseAdmin = createServiceClient()

  // 1. Verify that no Global Admin currently exists
  const { data: globalAdminProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('name', 'Global Admin')
    .single()

  if (profileError || !globalAdminProfile) {
    return { error: 'No se pudo encontrar el perfil de Global Admin en la base de datos.' }
  }

  const { data: existingAdmins, error: countError } = await supabaseAdmin
    .from('staff')
    .select('id', { count: 'exact' })
    .eq('profile_id', globalAdminProfile.id)

  if (countError) {
    return { error: 'Error al verificar administradores existentes.' }
  }

  if (existingAdmins && existingAdmins.length > 0) {
    return { error: 'Ya existe un Global Admin. No se pueden crear más por esta vía.' }
  }

  // 2. Create the Auth User using the Admin API (auto-confirms the email)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    console.error('Auth Error:', authError)
    return { error: 'Error al crear la cuenta de autenticación.' }
  }

  // 3. Create the Staff record
  const { error: staffError } = await supabaseAdmin
    .from('staff')
    .insert({
      auth_user_id: authUser.user.id,
      nombre,
      username: email, // Global Admin uses email as username
      email,
      profile_id: globalAdminProfile.id,
    })

  if (staffError) {
    console.error('Staff Insert Error:', staffError)
    // Rollback the auth user creation if staff insertion fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Error al crear el perfil de empleado.' }
  }

  // 4. Sign the user in automatically
  const supabase = await createServerClient()
  await supabase.auth.signInWithPassword({
    email,
    password,
  })

  redirect('/dashboard')
}
