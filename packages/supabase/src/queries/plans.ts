import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@novafit/types'

export async function getActivePlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('active', true)
    .order('price', { ascending: true })

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`)
  return data as Plan[]
}

export async function getPlanById(supabase: SupabaseClient, id: string): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch plan: ${error.message}`)
  return data as Plan
}
