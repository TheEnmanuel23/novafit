import { supabase } from '@/lib/supabase';
import { PlanType } from '@/lib/types';
import { format } from 'date-fns';
import { getCurrentDate } from '@/lib/utils';
import { toast } from 'sonner';

interface CreateMemberParams {
  selectedMemberId: string | null;
  nombre: string;
  telefono: string;
  planId?: string;
  planTipo: PlanType;
  planDays?: number;
  costo: number;
  isPromo: boolean;
  notes: string;
  fechaInicio: string;
  staffId?: string;
  staffName?: string;
  autoCheckIn: boolean;
}

export function useCreateMember() {
  const createMember = async (params: CreateMemberParams) => {
    const {
      selectedMemberId, nombre, telefono, planId, planTipo, planDays, 
      costo, isPromo, notes, fechaInicio, staffId, staffName, autoCheckIn
    } = params;

    const memberId = selectedMemberId || crypto.randomUUID();
    
    // Update or Create member profile
    if (selectedMemberId) {
      await supabase.from('members')
        .update({ nombre, telefono, updated_at: new Date().toISOString() })
        .eq('memberId', selectedMemberId);
    } else {
      await supabase.from('members').insert({
        memberId,
        nombre,
        telefono,
      });
    }
    
    // Add new purchase record to member_plans
    const { data: insertedPlan, error: insertError } = await supabase.from('member_plans').insert({
      memberId,
      plan_id: planId || null,
      plan_tipo: planTipo as any,
      ...((planDays && planDays > 0) ? { plan_days: planDays } : { plan_days: 30 }),
      costo,
      is_promo: isPromo,
      notes,
      fecha_inicio: new Date(fechaInicio + 'T12:00:00').toISOString(),
      registered_by: staffId,
      registered_by_name: staffName,
    }).select().single();
    
    if (insertError) {
      throw insertError;
    }
    
    if (autoCheckIn && insertedPlan) {
      await supabase.from('attendances').insert({
        memberId,
        member_plan_id: insertedPlan.id,
        fecha_hora: getCurrentDate().toISOString(),
      });
      toast.success('Check-in realizado de inmediato');
    }
    
    return insertedPlan;
  };

  return { createMember };
}
