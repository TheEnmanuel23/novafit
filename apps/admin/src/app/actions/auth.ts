'use server'

import { createServerClient, createServiceClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signIn(formData: FormData) {
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string
  
  console.info(`[AuthAction:signIn] Attempting sign in for: ${identifier}`)

  if (!identifier || !password) {
    console.warn(`[AuthAction:signIn] Missing credentials`)
    return { error: 'Por favor, ingrese sus credenciales' }
  }

  // If it doesn't contain an @, treat it as a username and use the dummy domain
  const email = identifier.includes('@') 
    ? identifier 
    : `${identifier.toLowerCase().replace(/\s+/g, '')}@staff.novafit.local`

  const supabase = await createServerClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error(`[AuthAction:signIn] Sign in failed:`, error)
    return { error: 'Credenciales inválidas' }
  }

  if (data?.user) {
    try {
      const adminClient = createServiceClient()
      await Promise.all([
        adminClient.from('staff').update({ is_online: true }).eq('auth_user_id', data.user.id),
        adminClient.from('user_sessions').insert({ auth_user_id: data.user.id, user_type: 'staff', action: 'login' })
      ])
    } catch (err) {
      console.error(`[AuthAction:signIn] Failed to log session/status:`, err)
    }
  }

  // Redirect to dashboard on success
  console.info(`[AuthAction:signIn] Sign in successful for: ${email}`)
  redirect('/dashboard')
}

export async function signOut() {
  console.info(`[AuthAction:signOut] Attempting sign out`)
  const supabase = await createServerClient()
  
  try {
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      const adminClient = createServiceClient()
      await Promise.all([
        adminClient.from('staff').update({ is_online: false }).eq('auth_user_id', data.user.id),
        adminClient.from('user_sessions').insert({ auth_user_id: data.user.id, user_type: 'staff', action: 'logout' })
      ])
    }
  } catch (err) {
    console.error(`[AuthAction:signOut] Failed to log session/status:`, err)
  }

  await supabase.auth.signOut()
  console.info(`[AuthAction:signOut] Sign out successful`)
  
  redirect('/login')
}

export async function sendResetPasswordEmail(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  console.info(`[AuthAction:sendResetPasswordEmail] Attempting reset for: ${email}`)
  if (!email) {
    console.warn(`[AuthAction:sendResetPasswordEmail] Missing email`)
    return { error: 'Por favor ingresa un correo.' }
  }

  const supabase = await createServerClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3010'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  })

  if (error) {
    console.error('[AuthAction:sendResetPasswordEmail] Reset Password Error:', error)
    return { error: 'No se pudo enviar el correo de recuperación.' }
  }

  console.info(`[AuthAction:sendResetPasswordEmail] Reset email sent successfully to: ${email}`)
  return { success: true }
}

export async function updateUserPassword(prevState: any, formData: FormData) {
  console.info(`[AuthAction:updateUserPassword] Attempting to update password`)
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    console.warn(`[AuthAction:updateUserPassword] Missing fields`)
    return { error: 'Por favor completa todos los campos.' }
  }

  if (password !== confirmPassword) {
    console.warn(`[AuthAction:updateUserPassword] Passwords do not match`)
    return { error: 'Las contraseñas no coinciden.' }
  }

  if (password.length < 6) {
    console.warn(`[AuthAction:updateUserPassword] Password too short`)
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error(`[AuthAction:updateUserPassword] Error updating password:`, error)
    return { error: 'Error al actualizar la contraseña.' }
  }

  console.info(`[AuthAction:updateUserPassword] Password updated successfully`)
  redirect('/dashboard')
}
