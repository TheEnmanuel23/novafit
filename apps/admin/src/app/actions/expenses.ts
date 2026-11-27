'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import {
  APP_TIMEZONE,
  getAppDate,
  toTimezoneYYYYMMDD,
} from '@novafit/supabase/src/utils/date'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { revalidatePath } from 'next/cache'
import type { ExpensePaymentStatus, RoleName } from '@novafit/types'

async function requireExpensesPermission(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  requiredRoles: RoleName[]
) {
  const staff = await getCurrentStaff(supabase)
  if (!staff) {
    throw new Error('No autenticado.')
  }
  const isGlobal = await isGlobalAdmin(staff)
  if (isGlobal) return staff

  for (const role of requiredRoles) {
    if (await hasRole(staff, role)) {
      return staff
    }
  }
  throw new Error('No tienes permisos para realizar esta acción.')
}

export async function createExpenseCategoryAction(name: string, description?: string) {
  const supabase = await createServerClient()
  try {
    const staff = await requireExpensesPermission(supabase, ['create_expenses'])
    const trimmedName = name.trim()
    if (!trimmedName) {
      return { error: 'El nombre de la categoría es obligatorio.' }
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        name: trimmedName,
        description: description?.trim() || null,
        created_by: staff.id,
        updated_by: staff.id,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe una categoría de gasto con ese nombre.' }
      }
      return { error: 'Error al crear la categoría: ' + error.message }
    }

    revalidatePath('/expenses')
    revalidatePath('/balance')
    return { success: true, category: data }
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al crear la categoría.',
    }
  }
}

export interface CreateExpenseInput {
  categoryId?: string | null
  concept: string
  expenseDateYMD: string // YYYY-MM-DD in Managua timezone
  paymentStatus: ExpensePaymentStatus // 'paid' | 'credit'
  paymentMethodId: string
  customPaymentMethod?: string
  assignedStaffId?: string | null
  total: number
  notes?: string
}

export async function createExpenseAction(input: CreateExpenseInput) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireExpensesPermission(supabase, ['create_expenses'])

    const concept = (input.concept || '').trim()
    if (!concept) {
      return { error: 'Ingresa el concepto o descripción del gasto.' }
    }

    const total = Number(input.total)
    if (isNaN(total) || total <= 0) {
      return { error: 'Ingresa un monto válido mayor a 0.' }
    }

    if (!input.paymentMethodId) {
      return { error: 'Selecciona un método de pago.' }
    }

    const now = await getAppDate()
    const todayYMD = toTimezoneYYYYMMDD(now, APP_TIMEZONE)
    let expenseDateISO = now.toISOString()
    if (
      input.expenseDateYMD &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.expenseDateYMD) &&
      input.expenseDateYMD !== todayYMD
    ) {
      const timePart = formatInTimeZone(now, APP_TIMEZONE, 'HH:mm:ss')
      expenseDateISO = fromZonedTime(
        `${input.expenseDateYMD}T${timePart}`,
        APP_TIMEZONE
      ).toISOString()
    }

    const assignedStaffId = input.assignedStaffId || currentStaff.id

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        category_id: input.categoryId || null,
        concept,
        expense_date: expenseDateISO,
        payment_status: input.paymentStatus === 'credit' ? 'credit' : 'paid',
        payment_method_id: input.paymentMethodId,
        custom_payment_method: input.customPaymentMethod?.trim() || null,
        assigned_staff_id: assignedStaffId,
        total: Number(total.toFixed(2)),
        notes: input.notes?.trim() || null,
        created_by: currentStaff.id,
        updated_by: currentStaff.id,
      })
      .select('*')
      .single()

    if (error || !expense) {
      console.error('[ExpenseAction:createExpense] Insert error:', error)
      return {
        error: 'Error al registrar el gasto: ' + (error?.message || 'Error desconocido'),
      }
    }

    revalidatePath('/expenses')
    revalidatePath('/balance')
    revalidatePath('/dashboard')

    return { success: true, expenseId: expense.id }
  } catch (err: unknown) {
    console.error('[ExpenseAction:createExpense] Unexpected error:', err)
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al registrar el gasto.',
    }
  }
}

export interface UpdateExpenseInput {
  expenseId: string
  categoryId?: string | null
  concept: string
  expenseDateYMD: string
  paymentStatus: ExpensePaymentStatus
  paymentMethodId: string
  customPaymentMethod?: string
  assignedStaffId?: string | null
  total: number
  notes?: string
}

export async function updateExpenseAction(input: UpdateExpenseInput) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireExpensesPermission(supabase, ['create_expenses'])

    if (!input.expenseId) {
      return { error: 'Gasto no especificado.' }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id, expense_date, assigned_staff_id, deleted')
      .eq('id', input.expenseId)
      .maybeSingle()

    if (fetchError || !existing || existing.deleted) {
      return { error: 'No se encontró el gasto a editar.' }
    }

    const concept = (input.concept || '').trim()
    if (!concept) {
      return { error: 'Ingresa el concepto del gasto.' }
    }

    const total = Number(input.total)
    if (isNaN(total) || total <= 0) {
      return { error: 'El monto debe ser mayor a 0.' }
    }

    if (!input.paymentMethodId) {
      return { error: 'Selecciona un método de pago.' }
    }

    let expenseDateISO = existing.expense_date
    if (input.expenseDateYMD && /^\d{4}-\d{2}-\d{2}$/.test(input.expenseDateYMD)) {
      const timePart = formatInTimeZone(existing.expense_date, APP_TIMEZONE, 'HH:mm:ss')
      expenseDateISO = fromZonedTime(
        `${input.expenseDateYMD}T${timePart}`,
        APP_TIMEZONE
      ).toISOString()
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        category_id: input.categoryId || null,
        concept,
        expense_date: expenseDateISO,
        payment_status: input.paymentStatus === 'credit' ? 'credit' : 'paid',
        payment_method_id: input.paymentMethodId,
        custom_payment_method: input.customPaymentMethod?.trim() || null,
        assigned_staff_id:
          input.assignedStaffId || existing.assigned_staff_id || currentStaff.id,
        total: Number(total.toFixed(2)),
        notes: input.notes?.trim() || null,
        updated_by: currentStaff.id,
      })
      .eq('id', input.expenseId)

    if (updateError) {
      return { error: 'Error al actualizar el gasto: ' + updateError.message }
    }

    revalidatePath('/expenses')
    revalidatePath('/balance')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    console.error('[ExpenseAction:updateExpense] Unexpected error:', err)
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al actualizar el gasto.',
    }
  }
}

export async function markExpenseAsPaidAction(expenseId: string) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireExpensesPermission(supabase, ['create_expenses'])

    const { error } = await supabase
      .from('expenses')
      .update({
        payment_status: 'paid',
        updated_by: currentStaff.id,
      })
      .eq('id', expenseId)

    if (error) {
      return { error: 'Error al marcar el gasto como pagado: ' + error.message }
    }

    revalidatePath('/expenses')
    revalidatePath('/balance')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al actualizar el gasto.',
    }
  }
}

export async function deleteExpenseAction(expenseId: string) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireExpensesPermission(supabase, ['delete_expenses'])

    const { error } = await supabase
      .from('expenses')
      .update({
        deleted: true,
        updated_by: currentStaff.id,
      })
      .eq('id', expenseId)

    if (error) {
      return { error: 'Error al eliminar el gasto: ' + error.message }
    }

    revalidatePath('/expenses')
    revalidatePath('/balance')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al eliminar el gasto.',
    }
  }
}

