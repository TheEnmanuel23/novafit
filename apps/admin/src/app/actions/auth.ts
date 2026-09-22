'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signIn(formData: FormData) {
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  if (!identifier || !password) {
    return { error: 'Por favor, ingrese sus credenciales' }
  }

  // If it doesn't contain an @, treat it as a username and use the dummy domain
  const email = identifier.includes('@') 
    ? identifier 
    : `${identifier.toLowerCase().replace(/\s+/g, '')}@staff.novafit.local`

  const supabase = await createServerClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Credenciales inválidas' }
  }

  // Redirect to dashboard on success
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  
  redirect('/login')
}

export async function sendResetPasswordEmail(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Por favor ingresa un correo.' }

  const supabase = await createServerClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3010'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  })

  if (error) {
    console.error('Reset Password Error:', error)
    return { error: 'No se pudo enviar el correo de recuperación.' }
  }

  return { success: true }
}

export async function updateUserPassword(prevState: any, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Por favor completa todos los campos.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Error al actualizar la contraseña.' }
  }

  redirect('/dashboard')
}
