'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import { APP_TIMEZONE, getAppDate } from '@novafit/supabase/src/utils/date'
import { fromZonedTime } from 'date-fns-tz'
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

    // Build sale timestamp in Managua timezone preserving current time of day if today, or noon Managua for selected date
    const now = await getAppDate()
    let saleDateISO = now.toISOString()
    if (input.saleDateYMD && /^\d{4}-\d{2}-\d{2}$/.test(input.saleDateYMD)) {
      const timePart = now.toTimeString().slice(0, 8)
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
    revalidatePath('/dashboard')

    return { success: true, saleId: sale.id }
  } catch (err: any) {
    console.error('[SalesAction:createSale] Unexpected error:', err)
    return { error: err.message || 'Error inesperado al registrar la venta.' }
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
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al eliminar la venta.' }
  }
}

