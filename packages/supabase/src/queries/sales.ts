import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentMethod, SaleWithDetails } from '@novafit/types'
import { getManaguaDayRange } from '../utils/date'

export async function getPaymentMethods(
  supabase: SupabaseClient
): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch payment methods: ${error.message}`)
  }

  return (data || []) as PaymentMethod[]
}

export async function getClientsForSales(
  supabase: SupabaseClient
): Promise<{ id: string; member_id: string; name: string; username: string; phone: string | null }[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, member_id, name, username, phone')
    .eq('deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }

  return data || []
}

export async function getStaffOptionsForSales(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; username: string }[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, username')
    .eq('deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch staff options: ${error.message}`)
  }

  return data || []
}

export async function getSales(
  supabase: SupabaseClient,
  opts: {
    startDate?: string
    endDate?: string
    paymentStatus?: 'paid' | 'credit'
    limit?: number
  } = {}
): Promise<SaleWithDetails[]> {
  let query = supabase
    .from('sales')
    .select(
      `
      *,
      items:sale_items (*),
      payment_method:payment_methods (*),
      assigned_staff:staff!sales_assigned_staff_id_fkey (id, name, username),
      creator:staff!sales_created_by_fkey (id, name, username),
      member:members!sales_member_id_fkey (id, member_id, name, username)
    `
    )
    .eq('deleted', false)
    .order('sale_date', { ascending: false })

  if (opts.startDate) {
    query = query.gte('sale_date', getManaguaDayRange(opts.startDate).start.toISOString())
  }
  if (opts.endDate) {
    query = query.lte('sale_date', getManaguaDayRange(opts.endDate).end.toISOString())
  }
  if (opts.paymentStatus) {
    query = query.eq('payment_status', opts.paymentStatus)
  }
  if (opts.limit) {
    query = query.limit(opts.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch sales: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    ...row,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    installments_count: Number(row.installments_count ?? 1),
    items: (row.items || []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
      unit_cost: Number(item.unit_cost ?? 0),
      subtotal: Number(item.subtotal ?? 0),
    })),
    payment_method: row.payment_method || null,
    assigned_staff: row.assigned_staff || null,
    creator: row.creator || null,
    member: row.member || null,
  })) as SaleWithDetails[]
}

