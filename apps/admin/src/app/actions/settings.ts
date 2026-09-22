'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getBusinessSettings() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching business settings:', error)
  }

  return data || { name: 'NovaFit', phone: '', address: '', logo_url: '' }
}

export async function updateBusinessSettings(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const logo = formData.get('logo') as File | null

  const supabase = await createServerClient()
  let logoUrl = formData.get('existingLogo') as string

  if (logo && logo.size > 0) {
    const fileExt = logo.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    
    const { error: uploadError, data } = await supabase.storage
      .from('assets')
      .upload(fileName, logo, { upsert: true })

    if (uploadError) {
      return { error: 'Error al subir el logo: ' + uploadError.message }
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('assets')
      .getPublicUrl(fileName)
      
    logoUrl = publicUrlData.publicUrl
  }

  const { error } = await supabase
    .from('business_settings')
    .upsert({
      id: 1,
      name,
      phone,
      address,
      logo_url: logoUrl,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return { error: 'Error al guardar la configuración: ' + error.message }
  }

  revalidatePath('/', 'layout')
  
  return { success: true }
}
