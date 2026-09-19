'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { processCheckIn } from '@novafit/supabase'
import type { CheckInResult } from '@novafit/types'

export async function checkInAction(
  type: 'username' | 'member_id',
  value: string
): Promise<CheckInResult> {
  // Add artificial delay for UI feedback
  await new Promise((resolve) => setTimeout(resolve, 500))

  const supabase = createServiceClient()

  try {
    return await processCheckIn(supabase, { type, value })
  } catch (error: any) {
    return {
      type: 'error' as any,
      message: error.message || 'Error del servidor al registrar visita',
    }
  }
}
