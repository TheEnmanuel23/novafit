import { getAppDate, getManaguaDayRange, getPeriodDayRange } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
import { syncMemberPlans } from '@novafit/supabase/src/queries/member-plans';
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
  opts: { 
    search?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string; 
    dateType?: 'starts_at' | 'created_at';
    page?: number; 
    limit?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
    plan_id?: string;
  } = {}
): Promise<{ members: MemberWithStatus[]; total: number }> {
  const { search, startDate, endDate, dateType = 'starts_at', page = 1, limit = 50, sort_by = 'created_at', order = 'desc', plan_id } = opts
  const offset = (page - 1) * limit

  const hasPlanDateFilter = !!(startDate || endDate) && dateType === 'starts_at';
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

  if (dateType === 'created_at') {
    if (startDate) {
      query = query.gte('created_at', getManaguaDayRange(startDate).start.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', getManaguaDayRange(endDate).end.toISOString())
    }
  } else {
    if (startDate) {
      query = query.gte('member_plans.starts_at', getPeriodDayRange(startDate).start.toISOString())
    }
    if (endDate) {
      query = query.lte('member_plans.starts_at', getPeriodDayRange(endDate).end.toISOString())
    }
  }

  // Database sorting for direct columns
  if (sort_by === 'name' || sort_by === 'created_at') {
    query = query.order(sort_by, { ascending: order === 'asc' })
  }

  // To avoid pagination issues with post-filtering or JS sorting, we'll fetch more and filter/sort
  const needsJSPostProcess = opts.status || opts.plan_id || ['status', 'plan', 'start_date'].includes(sort_by)
  if (!needsJSPostProcess) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch members: ${error.message}`)

  const appDate = await getAppDate();
  let members = await Promise.all(
    (data ?? []).map(async (m: any) => {
      await syncMemberPlans(supabase, m.member_plans as any[], appDate);
      const { status, active_plan, scheduled_plans } = computeMemberState(m.member_plans as any[], appDate);

      return {
        ...m,
        active_plan,
        scheduled_plans,
        status,
      } satisfies MemberWithStatus
    })
  )

  if (opts.status) {
    if (opts.status === 'active') {
      members = members.filter((m) => m.status === 'active' || m.status === 'low_balance')
    } else if (opts.status === 'scheduled') {
      members = members.filter((m) => m.status === 'scheduled' || (m.scheduled_plans && m.scheduled_plans.length > 0))
    } else {
      members = members.filter((m) => m.status === opts.status)
    }
  }

  if (opts.plan_id) {
    members = members.filter(
      (m) =>
        m.active_plan?.plan_id === opts.plan_id ||
        m.scheduled_plans?.some((sp: any) => sp.plan_id === opts.plan_id)
    )
  }

  if (needsJSPostProcess) {
    if (sort_by === 'status') {
      const orderMap: Record<string, number> = { active: 1, low_balance: 2, scheduled: 3, expired: 4, no_plan: 5 }
      members.sort((a, b) => {
        const diff = (orderMap[a.status] || 99) - (orderMap[b.status] || 99)
        return order === 'asc' ? diff : -diff
      })
    } else if (sort_by === 'plan') {
      members.sort((a, b) => {
        const valA = a.active_plan?.plan?.description || a.scheduled_plans?.[0]?.plan?.description || ''
        const valB = b.active_plan?.plan?.description || b.scheduled_plans?.[0]?.plan?.description || ''
        if (valA < valB) return order === 'asc' ? -1 : 1
        if (valA > valB) return order === 'asc' ? 1 : -1
        return 0
      })
    } else if (sort_by === 'start_date') {
      members.sort((a, b) => {
        const valA = a.active_plan?.starts_at || a.scheduled_plans?.[0]?.starts_at || '0000-00-00'
        const valB = b.active_plan?.starts_at || b.scheduled_plans?.[0]?.starts_at || '0000-00-00'
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
  await syncMemberPlans(supabase, data.member_plans as any[], appDate);
  const { status, active_plan, scheduled_plans } = computeMemberState(data.member_plans as any[], appDate);

  return {
    ...data,
    active_plan,
    scheduled_plans,
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
  await syncMemberPlans(supabase, data.member_plans as any[], appDate);
  const { status, active_plan, scheduled_plans } = computeMemberState(data.member_plans as any[], appDate);

  return {
    ...data,
    active_plan,
    scheduled_plans,
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
        creator:staff!member_plans_created_by_fkey(name),
        updater:staff!member_plans_updated_by_fkey(name),
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
  await syncMemberPlans(supabase, data.member_plans as any[], appDate);
  const { status, active_plan, scheduled_plans } = computeMemberState(data.member_plans as any[], appDate);

  return {
    ...data,
    active_plan,
    scheduled_plans,
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

export async function findDuplicateMembers(
  supabase: SupabaseClient,
  input: { field: 'name' | 'phone'; value: string }
): Promise<Pick<MemberWithStatus, 'id' | 'member_id' | 'name' | 'username' | 'phone' | 'status'>[]> {
  const trimmed = input.value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return []

  let query = supabase
    .from('members')
    .select(
      `
      id,
      member_id,
      name,
      username,
      phone,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, starts_at, status, created_at, updated_at
      )
    `
    )
    .eq('deleted', false)
    .limit(5)

  if (input.field === 'name') {
    if (trimmed.length < 3) return []
    query = query.ilike('name', `%${trimmed}%`)
  } else {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length < 4) return []
    const hyphenated = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits
    const patterns = Array.from(new Set([trimmed, digits, hyphenated]))
    const orFilter = patterns.map((p) => `phone.ilike.%${p}%`).join(',')
    query = query.or(orFilter)
  }

  const { data, error } = await query
  if (error || !data) return []

  const appDate = await getAppDate()
  return data.map((m: any) => {
    const { status } = computeMemberState(m.member_plans as any[], appDate)
    return {
      id: m.id,
      member_id: m.member_id,
      name: m.name,
      username: m.username,
      phone: m.phone,
      status,
    }
  })
}


