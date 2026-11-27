import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpenseCategory, ExpenseWithDetails } from '@novafit/types'
import { fromZonedTime } from 'date-fns-tz'
import { APP_TIMEZONE } from '../utils/date'

export async function getExpenseCategories(
  supabase: SupabaseClient
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('deleted', false)
    .order('name', { ascending: true })

  if (error) {
    console.error('[ExpenseQuery:getExpenseCategories] Error:', error)
    return []
  }
  return (data ?? []) as ExpenseCategory[]
}

export async function getExpenses(
  supabase: SupabaseClient,
  options?: {
    startDate?: string // YYYY-MM-DD in Managua timezone
    endDate?: string // YYYY-MM-DD in Managua timezone
    paymentStatus?: 'paid' | 'credit'
    limit?: number
  }
): Promise<ExpenseWithDetails[]> {
  let query = supabase
    .from('expenses')
    .select(
      `
      *,
      category:expense_categories (*),
      payment_method:payment_methods (*),
      assigned_staff:staff!assigned_staff_id (id, name, username),
      creator:staff!created_by (id, name, username)
    `
    )
    .eq('deleted', false)
    .order('expense_date', { ascending: false })
    .limit(options?.limit ?? 500)

  if (options?.startDate) {
    const startUtc = fromZonedTime(
      `${options.startDate}T00:00:00.000`,
      APP_TIMEZONE
    ).toISOString()
    query = query.gte('expense_date', startUtc)
  }

  if (options?.endDate) {
    const endUtc = fromZonedTime(
      `${options.endDate}T23:59:59.999`,
      APP_TIMEZONE
    ).toISOString()
    query = query.lte('expense_date', endUtc)
  }

  if (options?.paymentStatus) {
    query = query.eq('payment_status', options.paymentStatus)
  }

  const { data, error } = await query

  if (error) {
    console.error('[ExpenseQuery:getExpenses] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    total: Number(row.total ?? 0),
    category: row.category || null,
    payment_method: row.payment_method || null,
    assigned_staff: row.assigned_staff || null,
    creator: row.creator || null,
  })) as ExpenseWithDetails[]
}

