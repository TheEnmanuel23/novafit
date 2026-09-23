import type { SupabaseClient } from '@supabase/supabase-js'
import type { Member, MemberWithStatus } from '@novafit/types'

/** Generate a short unique username: ABCD-1234 (no ambiguous chars) */
export function generateUsername(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I, O
  const digits = '23456789' // no 0, 1
  const letters = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  const nums = Array.from({ length: 4 }, () =>
    digits[Math.floor(Math.random() * digits.length)]
  ).join('')
  return `${letters}-${nums}`
}

export async function generateUniqueUsername(supabase: SupabaseClient): Promise<string> {
  let username: string
  let attempts = 0
  do {
    username = generateUsername()
    const { data } = await supabase
      .from('members')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (!data) return username
    attempts++
  } while (attempts < 20)
  throw new Error('Could not generate unique username after 20 attempts')
}

export async function getMembers(
  supabase: SupabaseClient,
  opts: { search?: string; status?: string; page?: number; limit?: number } = {}
): Promise<{ members: MemberWithStatus[]; total: number }> {
  const { search, page = 1, limit = 20 } = opts
  const offset = (page - 1) * limit

  let query = supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at,
        plan:plans (*)
      )
    `,
      { count: 'exact' }
    )
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,username.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch members: ${error.message}`)

  const members = (data ?? []).map((m: any) => {
    const activePlan = (m.member_plans as any[])?.find(
      (mp: any) =>
        mp.status === 'active' && new Date(mp.expiration_date) > new Date()
    )

    let status: MemberWithStatus['status'] = 'no_plan'
    if (activePlan) {
      const remaining = activePlan.visits_purchased - activePlan.visits_used
      if (remaining <= 3) status = 'low_balance'
      else status = 'active'
    } else {
      const hasExpired = (m.member_plans as any[])?.some((mp: any) => mp.status === 'expired')
      if (hasExpired) status = 'expired'
    }

    return {
      ...m,
      active_plan: activePlan
        ? {
            ...activePlan,
            visits_remaining: activePlan.visits_purchased - activePlan.visits_used,
          }
        : null,
      status,
    } satisfies MemberWithStatus
  })

  return { members, total: count ?? 0 }
}

export async function getMemberByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<MemberWithStatus | null> {
  const { data, error } = await supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at,
        plan:plans (*)
      )
    `
    )
    .eq('username', username.toUpperCase())
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch member: ${error.message}`)
  if (!data) return null

  const activePlan = (data.member_plans as any[])?.find(
    (mp: any) =>
      mp.status === 'active' && new Date(mp.expiration_date) > new Date()
  )

  return {
    ...data,
    active_plan: activePlan
      ? {
          ...activePlan,
          visits_remaining: activePlan.visits_purchased - activePlan.visits_used,
        }
      : null,
    status: activePlan
      ? activePlan.visits_purchased - activePlan.visits_used <= 3
        ? 'low_balance'
        : 'active'
      : 'no_plan',
  } as MemberWithStatus
}

export async function getMemberByQrCode(
  supabase: SupabaseClient,
  memberId: string
): Promise<MemberWithStatus | null> {
  const { data, error } = await supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at,
        plan:plans (*)
      )
    `
    )
    .eq('member_id', memberId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch member by QR: ${error.message}`)
  if (!data) return null

  const activePlan = (data.member_plans as any[])?.find(
    (mp: any) =>
      mp.status === 'active' && new Date(mp.expiration_date) > new Date()
  )

  return {
    ...data,
    active_plan: activePlan
      ? {
          ...activePlan,
          visits_remaining: activePlan.visits_purchased - activePlan.visits_used,
        }
      : null,
    status: activePlan ? 'active' : 'no_plan',
  } as MemberWithStatus
}

export async function getMemberById(
  supabase: SupabaseClient,
  memberId: string
): Promise<MemberWithStatus | null> {
  const { data, error } = await supabase
    .from('members')
    .select(
      `
      *,
      creator:staff!members_created_by_fkey(nombre),
      updater:staff!members_updated_by_fkey(nombre),
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, starts_at, status, created_at, updated_at,
        plan:plans (*)
      )
    `
    )
    .eq('member_id', memberId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch member: ${error.message}`)
  if (!data) return null

  const plans = data.member_plans as any[]
  const activePlan = plans?.find(
    (mp: any) =>
      mp.status === 'active' && new Date(mp.expiration_date) > new Date()
  )

  let status: MemberWithStatus['status'] = 'no_plan'
  if (activePlan) {
    const remaining = activePlan.visits_purchased - activePlan.visits_used
    status = remaining <= 3 ? 'low_balance' : 'active'
  } else if (plans?.some((mp: any) => mp.status === 'expired')) {
    status = 'expired'
  }

  return {
    ...data,
    active_plan: activePlan
      ? {
          ...activePlan,
          visits_remaining: activePlan.visits_purchased - activePlan.visits_used,
        }
      : null,
    status,
  } as MemberWithStatus
}

export async function createMember(
  supabase: SupabaseClient,
  input: {
    nombre: string
    telefono?: string
    username: string
    qr_code: string
  }
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({
      nombre: input.nombre,
      telefono: input.telefono ?? null,
      username: input.username.toUpperCase(),
      qr_code: input.qr_code,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create member: ${error.message}`)
  return data as Member
}

export async function updateMemberUsername(
  supabase: SupabaseClient,
  memberId: string,
  username: string
): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ username: username.toUpperCase(), updated_at: new Date().toISOString() })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to update username: ${error.message}`)
}

export async function updateMemberDetails(
  supabase: SupabaseClient,
  memberId: string,
  input: {
    nombre: string
    telefono?: string
  },
  staffId: string
): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({
      nombre: input.nombre,
      telefono: input.telefono || null,
      updated_by: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to update member: ${error.message}`)
}

export async function softDeleteMember(
  supabase: SupabaseClient,
  memberId: string,
  staffId: string
): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({
      deleted: true,
      updated_by: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to deactivate member: ${error.message}`)
}

