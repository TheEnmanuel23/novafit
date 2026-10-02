import { getAppDate } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Member, MemberWithStatus } from '@novafit/types'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

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
  opts: { 
    search?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string; 
    page?: number; 
    limit?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ members: MemberWithStatus[]; total: number }> {
  const { search, startDate, endDate, page = 1, limit = 50, sort_by = 'created_at', order = 'desc' } = opts
  const offset = (page - 1) * limit

  const hasPlanDateFilter = !!(startDate || endDate);
  const memberPlansRelation = hasPlanDateFilter ? 'member_plans!inner' : 'member_plans';

  let query = supabase
    .from('members')
    .select(
      `
      *,
      creator:staff!members_created_by_fkey(name),
      ${memberPlansRelation} (
        id, plan_id, visits_purchased, visits_used, expiration_date, status, created_at, updated_at, starts_at,
        creator:staff!member_plans_created_by_fkey(name),
        updater:staff!member_plans_updated_by_fkey(name),
        plan:plans (*)
      )
    `,
      { count: 'exact' }
    )
    .eq('deleted', false)

  if (search) {
    query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (startDate) {
    const start = startOfDay(parseISO(startDate))
    query = query.gte('member_plans.starts_at', start.toISOString())
  }
  
  if (endDate) {
    const end = endOfDay(parseISO(endDate))
    query = query.lte('member_plans.starts_at', end.toISOString())
  }

  // Database sorting for direct columns
  if (sort_by === 'name' || sort_by === 'created_at') {
    query = query.order(sort_by, { ascending: order === 'asc' })
  }

  // To avoid pagination issues with post-filtering or JS sorting, we'll fetch more and filter/sort
  const needsJSPostProcess = opts.status || ['status', 'plan', 'start_date'].includes(sort_by)
  if (!needsJSPostProcess) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch members: ${error.message}`)

  const appDate = await getAppDate();
  let members = (data ?? []).map((m: any) => {
    const { status, active_plan } = computeMemberState(m.member_plans as any[], appDate);

    return {
      ...m,
      active_plan,
      status,
    } satisfies MemberWithStatus
  })

  if (opts.status) {
    if (opts.status === 'active') {
      members = members.filter((m) => m.status === 'active' || m.status === 'low_balance')
    } else {
      members = members.filter((m) => m.status === opts.status)
    }
  }

  if (needsJSPostProcess) {
    if (sort_by === 'status') {
      const orderMap: Record<string, number> = { 'active': 1, 'low_balance': 2, 'expired': 3, 'no_plan': 4 }
      members.sort((a, b) => {
        const diff = (orderMap[a.status] || 99) - (orderMap[b.status] || 99)
        return order === 'asc' ? diff : -diff
      })
    } else if (sort_by === 'plan') {
      members.sort((a, b) => {
        const valA = a.active_plan?.plan?.description || ''
        const valB = b.active_plan?.plan?.description || ''
        if (valA < valB) return order === 'asc' ? -1 : 1
        if (valA > valB) return order === 'asc' ? 1 : -1
        return 0
      })
    } else if (sort_by === 'start_date') {
      members.sort((a, b) => {
        const valA = a.active_plan?.starts_at || '0000-00-00'
        const valB = b.active_plan?.starts_at || '0000-00-00'
        if (valA < valB) return order === 'asc' ? -1 : 1
        if (valA > valB) return order === 'asc' ? 1 : -1
        return 0
      })
    }
    
    // Apply JS pagination
    members = members.slice(offset, offset + limit)
  }

  return { members, total: opts.status ? members.length : (count ?? 0) }
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

  const appDate = await getAppDate();
  const { status, active_plan } = computeMemberState(data.member_plans as any[], appDate);

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

  const appDate = await getAppDate();
  const { status, active_plan } = computeMemberState(data.member_plans as any[], appDate);

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

  const appDate = await getAppDate();
  const { status, active_plan } = computeMemberState(data.member_plans as any[], appDate);

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
  const appDate = await getAppDate();
  const { error } = await supabase
    .from('members')
    .update({ username: username.toUpperCase(), updated_at: appDate.toISOString() })
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
  const appDate = await getAppDate();
  const { error } = await supabase
    .from('members')
    .update({ name: input.name, phone: input.phone || null,
      updated_by: staffId,
      updated_at: appDate.toISOString(),
    })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to update member: ${error.message}`)
}

export async function softDeleteMember(
  supabase: SupabaseClient,
  memberId: string,
  staffId: string
): Promise<void> {
  const appDate = await getAppDate();
  const { error } = await supabase
    .from('members')
    .update({
      deleted: true,
      updated_by: staffId,
      updated_at: appDate.toISOString(),
    })
    .eq('member_id', memberId)

  if (error) throw new Error(`Failed to deactivate member: ${error.message}`)
}

