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
  
  // Try to get staff ID if logged in
  const authClient = await import('@novafit/supabase/src/server').then(m => m.createServerClient())
  const { getCurrentStaff } = await import('@novafit/supabase/src/queries/staff')
  const staff = await getCurrentStaff(authClient)

  try {
    return await processCheckIn(
      supabase, 
      { type, value },
      { staffId: staff?.auth_user_id, checkinType: type === 'member_id' ? 'qr' : 'manual' }
    )
  } catch (error: any) {
    return {
      type: 'error' as any,
      message: error.message || 'Error del servidor al registrar visita',
    }
  }
}
