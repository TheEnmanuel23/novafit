import { getAppDate } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInResult, MemberWithStatus } from '@novafit/types'
import { isBefore, isEqual, isAfter, startOfDay, endOfDay } from 'date-fns'

export async function getTodayVisitsCount(supabase: SupabaseClient): Promise<number> {
  const today = await getAppDate();
  const start = startOfDay(today);
  const end = endOfDay(today);

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
          expiration_date,
          visits_purchased,
          visits_used,
          updated_at
        )
      )
    `)

  if (options?.startDate) {
    const [year, month, day] = options.startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    query = query.gte('scanned_at', start.toISOString());
  }
  
  if (options?.endDate) {
    const [year, month, day] = options.endDate.split('-').map(Number);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    query = query.lte('scanned_at', end.toISOString());
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,username.ilike.%${options.search}%,phone.ilike.%${options.search}%`, { foreignTable: 'members' });
  }

  if (options?.sort_by) {
    const ascending = options.order === 'asc';
    if (options.sort_by === 'name' || options.sort_by === 'status') {
      // Supabase sorting by foreign tables has limited support depending on syntax,
      // but we can try to sort locally or rely on the query if supported.
      // Usually foreign table sort requires a different syntax or isn't fully supported via PostgREST natively for multiple layers.
      // For simplicity, if they sort by name, we might just sort the array in JS since limit is 100, 
      // but let's try Postgres first:
      query = query.order(`members(${options.sort_by})`, { ascending });
    } else {
      query = query.order(options.sort_by, { ascending });
    }
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

  // Fallback JS sort if PostgREST foreign sort failed or if sorting by status
  if (options?.sort_by === 'name' || options?.sort_by === 'status') {
    result.sort((a: any, b: any) => {
      const valA = a.members[options.sort_by!] || '';
      const valB = b.members[options.sort_by!] || '';
      if (valA < valB) return options.order === 'asc' ? -1 : 1;
      if (valA > valB) return options.order === 'asc' ? 1 : -1;
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
        id, plan_id, visits_purchased, visits_used, expiration_date, status, starts_at, updated_at,
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
  const start = startOfDay(appDate).toISOString();
  const end = endOfDay(appDate).toISOString();
  
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

  // 2. Find active plan (using member state logic which considers same-day exhaustion)
  const { active_plan: activePlan } = computeMemberState(member.member_plans, appDate);

  if (!activePlan) {
    // Check if there's an expired plan
    const { status } = computeMemberState(member.member_plans, appDate);
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
