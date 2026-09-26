import { getAppDate } from '@novafit/supabase/src/utils/date';
import { computeMemberState } from '@novafit/supabase/src/utils/member';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInResult, MemberWithStatus } from '@novafit/types'

export async function getTodayVisitsCount(supabase: SupabaseClient): Promise<number> {
  const today = getAppDate();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .gte('scanned_at', startOfDay.toISOString())
    .lte('scanned_at', endOfDay.toISOString());

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
      members!inner (
        member_id,
        name,
        username,
        phone,
        member_plans (
          status,
          expiration_date,
          visits_purchased,
          visits_used
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

  // Compute status for each member
  let result = data.map((row: any) => {
    const { status } = computeMemberState(row.members?.member_plans as any[]);

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
  lookup: { type: 'member_id' | 'username'; value: string }
): Promise<CheckInResult> {
  // 1. Fetch member with active plan
  const memberQuery = supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status,
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

  // 2. Find active plan
  const activePlan = (member.member_plans as any[]).find(
    (mp: any) =>
      mp.status === 'active' && 
      new Date(mp.expiration_date) > getAppDate() &&
      (!mp.starts_at || new Date(mp.starts_at) <= getAppDate())
  )

  if (!activePlan) {
    // Check if there's an expired plan
    const hasExpired = (member.member_plans as any[]).some(
      (mp: any) => mp.status === 'expired'
    )
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
    return {
      type: 'no_visits',
      member,
      balance_before: 0,
      balance_after: 0,
      expiration_date: activePlan.expiration_date,
      message: 'No quedan visitas en este plan.',
    }
  }

  // 4. Decrement visits_used
  const { error: updateError } = await supabase
    .from('member_plans')
    .update({
      visits_used: activePlan.visits_used + 1,
      updated_at: getAppDate().toISOString(),
    })
    .eq('id', activePlan.id)

  if (updateError) {
    return { type: 'no_plan', message: 'Error al registrar la visita.' }
  }

  const balanceAfter = balanceBefore - 1

  // 5. Write attendance record
  await supabase.from('attendances').insert({
    member_id: member.member_id,
    member_plan_id: activePlan.id,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    registered_by: null, // kiosk mode — no staff auth
  })

  return {
    type: 'success',
    member,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    expiration_date: activePlan.expiration_date,
    message: `¡Bienvenido, ${member.name}!`,
  }
}
