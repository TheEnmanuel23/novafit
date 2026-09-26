import { getAppDate } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
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
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at, starts_at,
        creator:staff!member_plans_created_by_fkey(name),
        updater:staff!member_plans_updated_by_fkey(name),
        plan:plans (*)
      )
    `,
      { count: 'exact' }
    )
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch members: ${error.message}`)

  const members = (data ?? []).map((m: any) => {
    const { status, active_plan } = computeMemberState(m.member_plans as any[]);

    return {
      ...m,
      active_plan,
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
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at, starts_at,
        creator:staff!member_plans_created_by_fkey(name),
        updater:staff!member_plans_updated_by_fkey(name),
        plan:plans (*)
      )
    `
    )
    .eq('username', username.toUpperCase())
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch member: ${error.message}`)
  if (!data) return null

  const { status, active_plan } = computeMemberState(data.member_plans as any[]);

  return {
    ...data,
    active_plan,
    status,
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
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at, starts_at,
        creator:staff!member_plans_created_by_fkey(name),
        updater:staff!member_plans_updated_by_fkey(name),
        plan:plans (*)
      )
    `
    )
    .eq('member_id', memberId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch member by QR: ${error.message}`)
  if (!data) return null

  const { status, active_plan } = computeMemberState(data.member_plans as any[]);

  return {
    ...data,
    active_plan,
    status,
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
      creator:staff!members_created_by_fkey(name),
      updater:staff!members_updated_by_fkey(name),
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

  const { status, active_plan } = computeMemberState(data.member_plans as any[]);

  return {
    ...data,
    active_plan,
    status,
  } as MemberWithStatus
}

export async function createMember(
  supabase: SupabaseClient,
  input: { name: string
    phone?: string
    username: string
    qr_code: string
  }
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ name: input.name, phone: input.phone ?? null,
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
    .update({ username: username.toUpperCase(), updated_at: getAppDate().toISOString() })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to update username: ${error.message}`)
}

export async function updateMemberDetails(
  supabase: SupabaseClient,
  memberId: string,
  input: { name: string
    phone?: string
  },
  staffId: string
): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ name: input.name, phone: input.phone || null,
      updated_by: staffId,
      updated_at: getAppDate().toISOString(),
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
      updated_at: getAppDate().toISOString(),
    })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to deactivate member: ${error.message}`)
}

