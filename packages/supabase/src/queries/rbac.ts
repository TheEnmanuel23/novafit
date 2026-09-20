import type { SupabaseClient } from '@supabase/supabase-js'

export async function getRoles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  if (error) throw new Error(`Failed to fetch roles: ${error.message}`)
  return data || []
}

export async function getProfilesWithRoles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      roles:profile_roles (
        role:roles (*)
      )
    `)
    .order('name')

  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`)

  return (data || []).map(p => ({
    ...p,
    roles: p.roles.map((pr: any) => pr.role)
  }))
}

export async function getProfileById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      roles:profile_roles (
        role:roles (*)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
  if (!data) return null

  return {
    ...data,
    roles: data.roles.map((pr: any) => pr.role)
  }
}
