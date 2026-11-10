import { getAppDate, getTodayYYYYMMDD, getManaguaDayRange, formatDateOnly } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
import { syncMemberPlans } from '@novafit/supabase/src/queries/member-plans';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInResult, MemberWithStatus } from '@novafit/types'

export async function getTodayVisitsCount(supabase: SupabaseClient): Promise<number> {
  const today = await getAppDate();
  const { start, end } = getManaguaDayRange(getTodayYYYYMMDD(today));

  const { count, error } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .gte('scanned_at', start.toISOString())
    .lte('scanned_at', end.toISOString());

  if (error) {
    console.error('Error fetching today visits count:', error);
    return 0;
  }

  return count || 0;
}

export async function getMemberAttendances(
  supabase: SupabaseClient,
  memberId: string,
  limit = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select(`
      id,
      scanned_at,
      balance_before,
      balance_after,
      checkin_type,
      registered_by,
      registrar:staff!attendances_registered_by_fkey(name),
      member_plan:member_plans (
        id,
        plan_id,
        plan:plans (
          id,
          description
        )
      )
    `)
    .eq('member_id', memberId)
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching member attendances:', error);
    return [];
  }

  return data ?? [];
}

export async function getAttendances(
  supabase: SupabaseClient,
  options?: {
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
    plan_id?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }
) {
  let query = supabase
    .from('attendances')
    .select(`
      id,
      scanned_at,
      balance_before,
      balance_after,
      checkin_type,
      created_by,
      updated_by,
      registered_by,
      member_plan:member_plans (
        plan_id,
        plan:plans (
          id,
          description
        )
      ),
      members!inner (
        member_id,
        name,
        username,
        phone,
        member_plans (
          status,
          starts_at,
          expiration_date,
          visits_purchased,
          visits_used,
          created_at,
          updated_at
        )
      )
    `)

  if (options?.startDate) {
    query = query.gte('scanned_at', getManaguaDayRange(options.startDate).start.toISOString());
  }
  
  if (options?.endDate) {
    query = query.lte('scanned_at', getManaguaDayRange(options.endDate).end.toISOString());
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,username.ilike.%${options.search}%,phone.ilike.%${options.search}%`, { foreignTable: 'members' });
  }

  const dbSortFields = ['scanned_at', 'checkin_type', 'balance_after', 'balance_before']
  if (options?.sort_by && dbSortFields.includes(options.sort_by)) {
    query = query.order(options.sort_by, { ascending: options.order === 'asc' });
  } else {
    query = query.order('scanned_at', { ascending: false });
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Error fetching attendances:', error);
    return [];
  }
  
  if (data.length === 0) {
     console.log('No attendances found with options:', options);
  }

  const appDate = await getAppDate();
  // Compute status for each member
  let result = data.map((row: any) => {
    const { status } = computeMemberState(row.members?.member_plans as any[], appDate);

    return {
      ...row,
      members: {
        ...row.members,
        status
      }
    };
  });

  // Filter locally by status if requested
  if (options?.status) {
    result = result.filter(r => r.members.status === options.status);
  }

  // Filter locally by plan if requested
  if (options?.plan_id) {
    result = result.filter(r => r.member_plan?.plan_id === options.plan_id);
  }

  // Sort locally for foreign/computed fields
  const sortBy = options?.sort_by;
  const isAsc = options?.order === 'asc';
  if (sortBy === 'name' || sortBy === 'username') {
    result.sort((a: any, b: any) => {
      const valA = (a.members?.[sortBy] || '').toLowerCase();
      const valB = (b.members?.[sortBy] || '').toLowerCase();
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  } else if (sortBy === 'status') {
    const orderMap: Record<string, number> = { active: 1, low_balance: 2, scheduled: 3, expired: 4, no_plan: 5 };
    result.sort((a: any, b: any) => {
      const diff = (orderMap[a.members?.status] || 99) - (orderMap[b.members?.status] || 99);
      return isAsc ? diff : -diff;
    });
  } else if (sortBy === 'plan') {
    result.sort((a: any, b: any) => {
      const valA = (a.member_plan?.plan?.description || '').toLowerCase();
      const valB = (b.member_plan?.plan?.description || '').toLowerCase();
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  }

  return result;
}

/**
 * Process a check-in by member_id (from QR code scan) or username (typed).
 * Uses service role client — no auth required.
 * Returns a CheckInResult with full details for the UI feedback screen.
 */
export async function processCheckIn(
  supabase: SupabaseClient,
  lookup: { type: 'member_id' | 'username'; value: string },
  options?: { staff?: any; checkinType?: string }
): Promise<CheckInResult> {
  // 1. Fetch member with active plan
  const memberQuery = supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status, starts_at, created_at, updated_at,
        plan:plans (*)
      )
    `
    )
    .eq('deleted', false)

  const { data: memberData, error: memberError } =
    lookup.type === 'member_id'
      ? await memberQuery.eq('member_id', lookup.value).maybeSingle()
      : await memberQuery.eq('username', lookup.value.toUpperCase()).maybeSingle()

  if (memberError) {
    return { type: 'no_plan', message: 'Error al buscar el miembro.' }
  }

  if (!memberData) {
    return { type: 'no_plan', message: 'Miembro no encontrado.' }
  }

  const member = memberData as any

  const appDate = await getAppDate();

  // 1.5. Check for today's check-ins FIRST
  const { start: dayStart, end: dayEnd } = getManaguaDayRange(getTodayYYYYMMDD(appDate));
  const start = dayStart.toISOString();
  const end = dayEnd.toISOString();
  
  const { data: todaysAttendances } = await supabase
    .from('attendances')
    .select('balance_before, balance_after, member_plan_id')
    .eq('member_id', member.member_id)
    .gte('scanned_at', start)
    .lte('scanned_at', end)
    .order('scanned_at', { ascending: false })
    .limit(1);

  const hasCheckedInToday = todaysAttendances && todaysAttendances.length > 0;

  if (hasCheckedInToday) {
    const lastCheckin = todaysAttendances[0];
    
    // Find the plan details to return expiration date if possible
    const planUsed = (member.member_plans as any[]).find(mp => mp.id === lastCheckin.member_plan_id);

    // Record the re-entry
    await supabase.from('attendances').insert({
      member_id: member.member_id,
      member_plan_id: lastCheckin.member_plan_id,
      balance_before: lastCheckin.balance_after, 
      balance_after: lastCheckin.balance_after, // No deduction
      registered_by: options?.staff?.id || null,
      created_by: options?.staff?.id || null,
      updated_by: options?.staff?.id || null,
      checkin_type: options?.checkinType || 'manual',
      scanned_at: appDate.toISOString(),
    });

    return {
      type: 'success',
      member,
      balance_before: lastCheckin.balance_after,
      balance_after: lastCheckin.balance_after,
      expiration_date: planUsed?.expiration_date,
      message: `¡Bienvenido, ${member.name}!`,
    }
  }

  // 2. Sync any scheduled plans that should now be active, then find active plan
  await syncMemberPlans(supabase, member.member_plans, appDate);
  const { active_plan: activePlan, scheduled_plans: scheduledPlans, status } = computeMemberState(member.member_plans, appDate);

  if (!activePlan) {
    if (scheduledPlans && scheduledPlans.length > 0) {
      return {
        type: 'no_plan',
        member,
        expiration_date: scheduledPlans[0].starts_at,
        message: `El plan de este miembro está programado para iniciar el ${formatDateOnly(scheduledPlans[0].starts_at)}.`,
      }
    }

    const hasExpired = status === 'expired';
    
    return {
      type: hasExpired ? 'expired' : 'no_plan',
      member,
      message: hasExpired
        ? 'El plan de este miembro ha expirado.'
        : 'Este miembro no tiene un plan activo.',
    }
  }

  const balanceBefore = activePlan.visits_purchased - activePlan.visits_used

  // 3. Check remaining visits
  if (balanceBefore <= 0) {
    // This shouldn't happen because activePlan should only be returned if it has balance OR if it was exhausted today and they re-entered.
    // If they exhausted it today, it would have been caught by the `hasCheckedInToday` block.
    // So if it reaches here, it means they ran out of visits.
    return {
      type: 'no_visits',
      member,
      balance_before: 0,
      balance_after: 0,
      expiration_date: activePlan.expiration_date,
      message: 'No quedan visitas en este plan.',
    }
  }

  const balanceAfter = balanceBefore - 1

  // 4. Update visits_used and status if empty
  const { error: updateError } = await supabase
    .from('member_plans')
    .update({
      visits_used: activePlan.visits_used + 1,
      status: balanceAfter <= 0 ? 'expired' : activePlan.status,
      updated_at: appDate.toISOString(),
    })
    .eq('id', activePlan.id)

  if (updateError) {
    return { type: 'no_plan', message: 'Error al registrar la visita.' }
  }

  // 5. Write attendance record
  const { error: insertError } = await supabase.from('attendances').insert({
    member_id: member.member_id,
    member_plan_id: activePlan.id,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    registered_by: options?.staff?.id || null,
    created_by: options?.staff?.id || null,
    updated_by: options?.staff?.id || null,
    checkin_type: options?.checkinType || 'manual',
    scanned_at: appDate.toISOString(),
  })

  if (insertError) {
    console.error('Error inserting attendance:', insertError);
    // Even if it fails, the visits were updated, but we should log it
    // Or we could return an error, but the member was already checked in (visits deducted)
    // Ideally we should do it in a transaction via RPC, but for now log it.
  }

  return {
    type: 'success',
    member,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    expiration_date: activePlan.expiration_date,
    message: `¡Bienvenido, ${member.name}!`,
  }
}
