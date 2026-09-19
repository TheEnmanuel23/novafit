import type { SupabaseClient } from '@supabase/supabase-js'
import type { Staff, StaffWithProfile } from '@novafit/types'

export async function getStaffByAuthId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<StaffWithProfile | null> {
  const { data, error } = await supabase
    .from('staff')
    .select(
      `
      *,
      profile:profiles (
        *,
        roles:profile_roles (
          role:roles (*)
        )
      )
    `
    )
    .eq('auth_user_id', authUserId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`)
  if (!data) return null

  // Flatten roles from junction
  const profile = data.profile as any
  const flattenedProfile = {
    ...profile,
    roles: (profile.roles as any[]).map((pr: any) => pr.role),
  }

  return { ...data, profile: flattenedProfile } as StaffWithProfile
}

export async function getStaffList(supabase: SupabaseClient): Promise<StaffWithProfile[]> {
  const { data, error } = await supabase
    .from('staff')
    .select(
      `
      *,
      profile:profiles (
        *,
        roles:profile_roles (role:roles (*))
      )
    `
    )
    .eq('deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch staff list: ${error.message}`)

  return (data ?? []).map((s: any) => ({
    ...s,
    profile: {
      ...s.profile,
      roles: s.profile.roles.map((pr: any) => pr.role),
    },
  })) as StaffWithProfile[]
}

export async function hasRole(
  staff: StaffWithProfile,
  roleName: string
): Promise<boolean> {
  return staff.profile.roles.some((r) => r.name === roleName)
}

export async function isGlobalAdmin(staff: StaffWithProfile): Promise<boolean> {
  return staff.profile.name === 'Global Admin'
}

export async function getStaffCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('deleted', false)

  if (error) return 0
  return count ?? 0
}
