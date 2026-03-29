import { supabase } from '@/lib/supabase';
import { PlanType } from '@/lib/types';
import { format } from 'date-fns';

interface EditMemberParams {
  editingMemberId: number | string;
  editingPlanId: string;
  nombre: string;
  telefono: string;
  planId?: string;
  planTipo: PlanType;
  planDays?: number;
  costo: number;
  isPromo: boolean;
  notes: string;
  fechaInicio: string;
}

export function useEditMember() {
  const editMember = async (params: EditMemberParams) => {
    const {
      editingMemberId, editingPlanId, nombre, telefono, planId, 
      planTipo, planDays, costo, isPromo, notes, fechaInicio
    } = params;

    // Upate the underlying member profile
    await supabase.from('members').update({
      nombre,
      telefono,
      updated_at: new Date().toISOString(),
    }).eq('id', editingMemberId);

    // Update the existing member plan record
    const { error: updateError } = await supabase.from('member_plans').update({
      plan_id: planId || null,
      plan_tipo: planTipo as any,
      ...((planDays && planDays > 0) ? { plan_days: planDays } : {}),
      costo,
      is_promo: isPromo,
      notes,
      fecha_inicio: new Date(fechaInicio + 'T12:00:00').toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', editingPlanId);
    
    if (updateError) {
      throw updateError;
    }
    
    return true;
  };

  return { editMember };
}
