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
import type { RoleName, SalePaymentStatus, SaleType } from '@novafit/types'

async function requireSalesPermission(supabase: any, requiredRoles: RoleName[]) {
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

export interface CreateSaleInput {
  saleType: SaleType
  saleDateYMD: string // YYYY-MM-DD in Managua timezone
  paymentStatus: SalePaymentStatus // 'paid' | 'credit'
  installmentsCount: number
  paymentMethodId: string
  customPaymentMethod?: string
  assignedStaffId: string
  memberId?: string | null
  discount: number
  receiptName?: string
  receiptDetails?: string
  items: {
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    unitCost?: number
  }[]
  // Free sale fields when saleType === 'free'
  freeSaleAmount?: number
  freeSaleConcept?: string
}

export async function createSaleAction(input: CreateSaleInput) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, ['create_sales'])

    // Validate installments
    const installments = Math.max(1, Math.floor(Number(input.installmentsCount) || 1))
    if (isNaN(installments) || installments < 1) {
      return { error: 'La cantidad de pagos debe ser al menos 1.' }
    }

    if (!input.paymentMethodId) {
      return { error: 'Selecciona un método de pago.' }
    }

    // Build sale timestamp in Managua timezone: use exact `now` for today,
    // or preserve Managua time-of-day (not server UTC time) for another selected date
    const now = await getAppDate()
    const todayYMD = toTimezoneYYYYMMDD(now, APP_TIMEZONE)
    let saleDateISO = now.toISOString()
    if (
      input.saleDateYMD &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.saleDateYMD) &&
      input.saleDateYMD !== todayYMD
    ) {
      const timePart = formatInTimeZone(now, APP_TIMEZONE, 'HH:mm:ss')
      saleDateISO = fromZonedTime(
        `${input.saleDateYMD}T${timePart}`,
        APP_TIMEZONE
      ).toISOString()
    }

    let lineItems: {
      product_id: string | null
      product_name: string
      quantity: number
      unit_price: number
      unit_cost: number
      subtotal: number
    }[] = []

    if (input.saleType === 'free') {
      const amount = Number(input.freeSaleAmount)
      if (isNaN(amount) || amount <= 0) {
        return { error: 'Ingresa un monto válido mayor a 0 para la venta libre.' }
      }
      const concept =
        input.freeSaleConcept?.trim() ||
        input.receiptName?.trim() ||
        'Venta libre'

      lineItems = [
        {
          product_id: null,
          product_name: concept,
          quantity: 1,
          unit_price: amount,
          unit_cost: 0,
          subtotal: amount,
        },
      ]
    } else {
      if (!input.items || input.items.length === 0) {
        return { error: 'Selecciona al menos un producto para registrar la venta.' }
      }

      for (const item of input.items) {
        const qty = Number(item.quantity)
        const price = Number(item.unitPrice)
        if (isNaN(qty) || qty <= 0) {
          return {
            error: `La cantidad para "${item.productName}" debe ser mayor a 0.`,
          }
        }
        if (isNaN(price) || price < 0) {
          return {
            error: `El precio para "${item.productName}" no puede ser negativo.`,
          }
        }

        lineItems.push({
          product_id: item.productId,
          product_name: item.productName,
          quantity: qty,
          unit_price: price,
          unit_cost: Number(item.unitCost || 0),
          subtotal: Number((qty * price).toFixed(2)),
        })
      }
    }

    const subtotal = Number(
      lineItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
    )
    const rawDiscount = Math.max(0, Number(input.discount) || 0)
    const discount = Math.min(subtotal, Number(rawDiscount.toFixed(2)))
    const total = Number(Math.max(0, subtotal - discount).toFixed(2))

    const assignedStaffId = input.assignedStaffId || currentStaff.id

    // 1. Insert sale header
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_type: input.saleType,
        sale_date: saleDateISO,
        payment_status: input.paymentStatus === 'credit' ? 'credit' : 'paid',
        installments_count: installments,
        payment_method_id: input.paymentMethodId,
        custom_payment_method: input.customPaymentMethod?.trim() || null,
        assigned_staff_id: assignedStaffId,
        member_id: input.memberId || null,
        subtotal,
        discount,
        total,
        receipt_name: input.receiptName?.trim() || null,
        receipt_details: input.receiptDetails?.trim() || null,
        created_by: currentStaff.id,
        updated_by: currentStaff.id,
      })
      .select('*')
      .single()

    if (saleError || !sale) {
      console.error('[SalesAction:createSale] Error inserting sale:', saleError)
      return {
        error:
          'Error al registrar la venta: ' +
          (saleError?.message || 'Error desconocido'),
      }
    }

    // 2. Insert sale items
    const itemsToInsert = lineItems.map((li) => ({
      ...li,
      sale_id: sale.id,
      created_by: currentStaff.id,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('[SalesAction:createSale] Error inserting sale items:', itemsError)
      return {
        error: 'Error al guardar el detalle de la venta: ' + itemsError.message,
      }
    }

    // 3. Decrement inventory stock for product items and record who updated it
    // (The database trigger `products_history_trigger` on `products` automatically records
    // the before & after `quantity_available` and `changed_by` in `product_history`)
    if (input.saleType === 'products') {
      for (const li of lineItems) {
        if (!li.product_id) continue

        const { data: prod } = await supabase
          .from('products')
          .select('id, quantity_available')
          .eq('id', li.product_id)
          .maybeSingle()

        if (prod) {
          const currentQty = Number(prod.quantity_available ?? 0)
          const nextQty = Number((currentQty - li.quantity).toFixed(2))

          const { error: stockErr } = await supabase
            .from('products')
            .update({
              quantity_available: nextQty,
              updated_by: currentStaff.id,
            })
            .eq('id', li.product_id)

          if (stockErr) {
            console.error(
              `[SalesAction:createSale] Error updating stock for product ${li.product_id}:`,
              stockErr
            )
          }
        }
      }
    }

    revalidatePath('/sales')
    revalidatePath('/inventory')
    revalidatePath('/balance')
    revalidatePath('/dashboard')

    return { success: true, saleId: sale.id }
  } catch (err: any) {
    console.error('[SalesAction:createSale] Unexpected error:', err)
    return { error: err.message || 'Error inesperado al registrar la venta.' }
  }
}

export interface UpdateSaleInput {
  saleId: string
  saleDateYMD: string // YYYY-MM-DD in Managua timezone
  paymentStatus: SalePaymentStatus // 'paid' | 'credit'
  installmentsCount: number
  paymentMethodId: string
  customPaymentMethod?: string
  assignedStaffId?: string | null
  discount: number
  receiptName?: string
  receiptDetails?: string
  items: {
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    unitCost?: number
  }[]
}

export async function updateSaleAction(input: UpdateSaleInput) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, ['create_sales'])

    if (!input.saleId) {
      return { error: 'Venta no especificada.' }
    }

    const { data: existingSale, error: fetchSaleError } = await supabase
      .from('sales')
      .select('id, sale_type, sale_date, assigned_staff_id, deleted')
      .eq('id', input.saleId)
      .maybeSingle()

    if (fetchSaleError || !existingSale || existingSale.deleted) {
      return { error: 'No se encontró la venta a editar.' }
    }

    const installments = Math.max(1, Math.floor(Number(input.installmentsCount) || 1))
    if (isNaN(installments) || installments < 1) {
      return { error: 'La cantidad de pagos debe ser al menos 1.' }
    }

    if (!input.paymentMethodId) {
      return { error: 'Selecciona un método de pago.' }
    }

    if (!input.items || input.items.length === 0) {
      return { error: 'La venta debe tener al menos un ítem.' }
    }

    const lineItems: {
      product_id: string | null
      product_name: string
      quantity: number
      unit_price: number
      unit_cost: number
      subtotal: number
    }[] = []

    for (const item of input.items) {
      const productName = (item.productName || '').trim()
      const qty = Number(item.quantity)
      const price = Number(item.unitPrice)
      if (!productName) {
        return { error: 'Todos los ítems deben tener un nombre o concepto.' }
      }
      if (isNaN(qty) || qty <= 0) {
        return { error: `La cantidad para "${productName}" debe ser mayor a 0.` }
      }
      if (isNaN(price) || price < 0) {
        return { error: `El precio para "${productName}" no puede ser negativo.` }
      }

      lineItems.push({
        product_id: item.productId || null,
        product_name: productName,
        quantity: qty,
        unit_price: price,
        unit_cost: Number(item.unitCost || 0),
        subtotal: Number((qty * price).toFixed(2)),
      })
    }

    // Preserve original Managua time-of-day when changing the date
    let saleDateISO = existingSale.sale_date
    if (input.saleDateYMD && /^\d{4}-\d{2}-\d{2}$/.test(input.saleDateYMD)) {
      const timePart = formatInTimeZone(existingSale.sale_date, APP_TIMEZONE, 'HH:mm:ss')
      saleDateISO = fromZonedTime(
        `${input.saleDateYMD}T${timePart}`,
        APP_TIMEZONE
      ).toISOString()
    }

    const subtotal = Number(
      lineItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
    )
    const rawDiscount = Math.max(0, Number(input.discount) || 0)
    const discount = Math.min(subtotal, Number(rawDiscount.toFixed(2)))
    const total = Number(Math.max(0, subtotal - discount).toFixed(2))

    // Fetch existing sale items before replacing so we can compute exact inventory stock deltas
    const { data: oldItems } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', input.saleId)

    // 1. Update sale header
    const { error: updateSaleError } = await supabase
      .from('sales')
      .update({
        sale_date: saleDateISO,
        payment_status: input.paymentStatus === 'credit' ? 'credit' : 'paid',
        installments_count: installments,
        payment_method_id: input.paymentMethodId,
        custom_payment_method: input.customPaymentMethod?.trim() || null,
        assigned_staff_id: input.assignedStaffId || existingSale.assigned_staff_id || currentStaff.id,
        subtotal,
        discount,
        total,
        receipt_name: input.receiptName?.trim() || null,
        receipt_details: input.receiptDetails?.trim() || null,
        updated_by: currentStaff.id,
      })
      .eq('id', input.saleId)

    if (updateSaleError) {
      console.error('[SalesAction:updateSale] Error updating sale:', updateSaleError)
      return { error: 'Error al actualizar la venta: ' + updateSaleError.message }
    }

    // 2. Replace sale items
    const { error: deleteItemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', input.saleId)

    if (deleteItemsError) {
      console.error('[SalesAction:updateSale] Error replacing sale items:', deleteItemsError)
      return { error: 'Error al actualizar los ítems de la venta: ' + deleteItemsError.message }
    }

    const itemsToInsert = lineItems.map((li) => ({
      ...li,
      sale_id: input.saleId,
      created_by: currentStaff.id,
    }))

    const { error: insertItemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert)

    if (insertItemsError) {
      console.error('[SalesAction:updateSale] Error inserting updated sale items:', insertItemsError)
      return { error: 'Error al guardar los ítems actualizados: ' + insertItemsError.message }
    }

    // 3. Reconcile inventory stock for product sales (oldQty - newQty)
    if (existingSale.sale_type === 'products') {
      const oldQtyByProduct = new Map<string, number>()
      for (const item of oldItems || []) {
        if (!item.product_id) continue
        oldQtyByProduct.set(
          item.product_id,
          (oldQtyByProduct.get(item.product_id) ?? 0) + Number(item.quantity ?? 0)
        )
      }

      const newQtyByProduct = new Map<string, number>()
      for (const item of lineItems) {
        if (!item.product_id) continue
        newQtyByProduct.set(
          item.product_id,
          (newQtyByProduct.get(item.product_id) ?? 0) + Number(item.quantity ?? 0)
        )
      }

      const affectedProductIds = new Set<string>([
        ...oldQtyByProduct.keys(),
        ...newQtyByProduct.keys(),
      ])

      for (const productId of affectedProductIds) {
        const oldQty = oldQtyByProduct.get(productId) ?? 0
        const newQty = newQtyByProduct.get(productId) ?? 0
        const delta = Number((oldQty - newQty).toFixed(2))
        if (delta === 0) continue

        const { data: prod } = await supabase
          .from('products')
          .select('id, quantity_available')
          .eq('id', productId)
          .maybeSingle()

        if (prod) {
          const nextQty = Number((Number(prod.quantity_available ?? 0) + delta).toFixed(2))
          await supabase
            .from('products')
            .update({
              quantity_available: nextQty,
              updated_by: currentStaff.id,
            })
            .eq('id', productId)
        }
      }
    }

    revalidatePath('/sales')
    revalidatePath('/inventory')
    revalidatePath('/balance')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: unknown) {
    console.error('[SalesAction:updateSale] Unexpected error:', err)
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al actualizar la venta.',
    }
  }
}

export async function deleteSaleAction(saleId: string, restoreStock: boolean = true) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, ['delete_sales'])

    if (restoreStock) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId)

      for (const item of items || []) {
        if (!item.product_id) continue
        const { data: prod } = await supabase
          .from('products')
          .select('id, quantity_available')
          .eq('id', item.product_id)
          .maybeSingle()

        if (prod) {
          const restoredQty = Number(
            (Number(prod.quantity_available ?? 0) + Number(item.quantity ?? 0)).toFixed(2)
          )
          await supabase
            .from('products')
            .update({
              quantity_available: restoredQty,
              updated_by: currentStaff.id,
            })
            .eq('id', item.product_id)
        }
      }
    }

    const { error } = await supabase
      .from('sales')
      .update({
        deleted: true,
        updated_by: currentStaff.id,
      })
      .eq('id', saleId)

    if (error) {
      return { error: 'Error al eliminar la venta: ' + error.message }
    }

    revalidatePath('/sales')
    revalidatePath('/inventory')
    revalidatePath('/balance')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al eliminar la venta.' }
  }
}

export async function markSaleAsPaidAction(saleId: string) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, ['create_sales'])

    const { error } = await supabase
      .from('sales')
      .update({
        payment_status: 'paid',
        updated_by: currentStaff.id,
      })
      .eq('id', saleId)

    if (error) {
      return { error: 'Error al marcar como pagada: ' + error.message }
    }

    revalidatePath('/balance')
    revalidatePath('/sales')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al actualizar la venta.' }
  }
}

export async function openCashRegisterAction(openingAmount: number, notes?: string) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, [
      'manage_cash_register',
      'create_sales',
    ])

    const safeOpening = Number(openingAmount)
    if (isNaN(safeOpening) || safeOpening < 0) {
      return { error: 'La base inicial debe ser un monto mayor o igual a 0.' }
    }

    // Check if there is already an open session
    const { data: existingOpen } = await supabase
      .from('cash_register_sessions')
      .select('id')
      .eq('status', 'open')
      .maybeSingle()

    if (existingOpen) {
      return { error: 'Ya existe una caja abierta actualmente. Ciérrala antes de abrir una nueva.' }
    }

    const nowISO = (await getAppDate()).toISOString()

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .insert({
        status: 'open',
        opening_amount: Number(safeOpening.toFixed(2)),
        expected_cash_amount: Number(safeOpening.toFixed(2)),
        notes: notes?.trim() || null,
        opened_at: nowISO,
        opened_by: currentStaff.id,
        created_by: currentStaff.id,
        updated_by: currentStaff.id,
      })
      .select('*')
      .single()

    if (error) {
      return { error: 'Error al abrir caja: ' + error.message }
    }

    revalidatePath('/balance')
    return { success: true, session: data }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al abrir la caja.' }
  }
}

export async function closeCashRegisterAction(input: {
  sessionId: string
  countedCashAmount: number
  notes?: string
}) {
  const supabase = await createServerClient()

  try {
    const currentStaff = await requireSalesPermission(supabase, [
      'manage_cash_register',
      'create_sales',
    ])

    const counted = Number(input.countedCashAmount)
    if (isNaN(counted) || counted < 0) {
      return { error: 'El efectivo contado en caja debe ser un número mayor o igual a 0.' }
    }

    const { data: session, error: fetchErr } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('id', input.sessionId)
      .eq('status', 'open')
      .maybeSingle()

    if (fetchErr || !session) {
      return { error: 'No se encontró la sesión de caja abierta.' }
    }

    const nowISO = (await getAppDate()).toISOString()
    const openedAtTime = new Date(session.opened_at).getTime()
    const nowTime = new Date(nowISO).getTime()
    const openedYMD = toTimezoneYYYYMMDD(session.opened_at, APP_TIMEZONE)

    // Calculate paid sales registered during this cash session window (opened_at -> now)
    const { data: candidateSales } = await supabase
      .from('sales')
      .select(
        `
        id,
        total,
        sale_date,
        created_at,
        payment_status,
        payment_method:payment_methods (key)
      `
      )
      .eq('deleted', false)
      .eq('payment_status', 'paid')
      .or(`sale_date.gte.${session.opened_at},created_at.gte.${session.opened_at}`)

    const sessionSales = (candidateSales || []).filter((s) => {
      const saleTime = new Date(s.sale_date).getTime()
      const createdTime = new Date(s.created_at).getTime()
      if (saleTime >= openedAtTime && saleTime <= nowTime) return true
      if (createdTime >= openedAtTime && createdTime <= nowTime) {
        const saleYMD = toTimezoneYYYYMMDD(s.sale_date, APP_TIMEZONE)
        return saleYMD >= openedYMD
      }
      return false
    })

    let cashSalesTotal = 0
    let otherSalesTotal = 0

    for (const s of sessionSales || []) {
      const amt = Number(s.total ?? 0)
      const pmKey = (s.payment_method as any)?.key || 'cash'
      if (pmKey === 'cash') {
        cashSalesTotal += amt
      } else {
        otherSalesTotal += amt
      }
    }

    cashSalesTotal = Number(cashSalesTotal.toFixed(2))
    otherSalesTotal = Number(otherSalesTotal.toFixed(2))
    const totalSales = Number((cashSalesTotal + otherSalesTotal).toFixed(2))
    const openingAmount = Number(session.opening_amount ?? 0)
    const expectedCashAmount = Number((openingAmount + cashSalesTotal).toFixed(2))
    const countedCashAmount = Number(counted.toFixed(2))
    const differenceAmount = Number((countedCashAmount - expectedCashAmount).toFixed(2))

    const { error: updateErr } = await supabase
      .from('cash_register_sessions')
      .update({
        status: 'closed',
        cash_sales_total: cashSalesTotal,
        other_sales_total: otherSalesTotal,
        total_sales: totalSales,
        expected_cash_amount: expectedCashAmount,
        counted_cash_amount: countedCashAmount,
        difference_amount: differenceAmount,
        notes: input.notes?.trim() || session.notes || null,
        closed_at: nowISO,
        closed_by: currentStaff.id,
        updated_by: currentStaff.id,
      })
      .eq('id', session.id)

    if (updateErr) {
      return { error: 'Error al cerrar la caja: ' + updateErr.message }
    }

    revalidatePath('/balance')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al cerrar la caja.' }
  }
}

