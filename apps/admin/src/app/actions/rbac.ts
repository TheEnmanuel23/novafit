'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { revalidatePath } from 'next/cache'

export async function saveProfile(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  
  // Verify Global Admin
  const { data: isGlobalAdmin } = await supabase.rpc('is_global_admin')
  if (!isGlobalAdmin) {
    return { error: 'Acceso denegado.' }
  }

  const id = formData.get('id') as string | null
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const roleIds = formData.getAll('roles') as string[]

  if (!name) return { error: 'El nombre es requerido.' }

  try {
    let profileId = id

    if (!id) {
      // Create new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({ name, description, is_system: false })
        .select()
        .single()
      
      if (error) throw error
      profileId = data.id
    } else {
      // Update existing
      const { error } = await supabase
        .from('profiles')
        .update({ name, description })
        .eq('id', id)
        
      if (error) throw error
    }

    // Sync roles (delete all and re-insert)
    await supabase.from('profile_roles').delete().eq('profile_id', profileId)
    
    if (roleIds.length > 0) {
      const mappings = roleIds.map(rId => ({ profile_id: profileId, role_id: rId }))
      const { error: rolesError } = await supabase.from('profile_roles').insert(mappings)
      if (rolesError) throw rolesError
    }

    revalidatePath('/staff/profiles')
    return { success: true }
  } catch (error: any) {
    console.error('Error saving profile:', error)
    return { error: error.message || 'Error al guardar el perfil.' }
  }
}
