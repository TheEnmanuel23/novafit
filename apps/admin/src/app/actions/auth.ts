'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { redirect } from 'next/navigation'

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
