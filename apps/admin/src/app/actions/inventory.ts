'use server'

import { createServerClient } from '@novafit/supabase/src/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getUnitDefinition,
  getProductHistory,
} from '@novafit/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { RoleName } from '@novafit/types'

async function requireInventoryPermission(
  supabase: any,
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

async function uploadProductImageFile(supabase: any, file: File): Promise<string> {
  const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
  const safeName = `products/product-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(safeName, file, { upsert: true })

  if (uploadError) {
    throw new Error('Error al subir imagen: ' + uploadError.message)
  }

  const { data: publicUrlData } = supabase.storage
    .from('assets')
    .getPublicUrl(safeName)

  return publicUrlData.publicUrl
}

export async function createProductCategoryAction(name: string, description?: string) {
  const supabase = await createServerClient()
  try {
    const staff = await requireInventoryPermission(supabase, [
      'create_products',
      'edit_products',
    ])

    const trimmedName = name.trim()
    if (!trimmedName) {
      return { error: 'El nombre de la categoría es obligatorio.' }
    }

    const { data, error } = await supabase
      .from('product_categories')
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
        return { error: 'Ya existe una categoría con ese nombre.' }
      }
      return { error: 'Error al crear la categoría: ' + error.message }
    }

    revalidatePath('/inventory')
    revalidatePath('/inventory/new')
    return { success: true, category: data }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al crear la categoría.' }
  }
}

export async function deleteProductCategoryAction(categoryId: string) {
  const supabase = await createServerClient()
  try {
    await requireInventoryPermission(supabase, ['delete_products'])

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      return { error: 'Error al eliminar la categoría: ' + error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado.' }
  }
}

export async function createProductAction(prevState: any, formData: FormData) {
  const supabase = await createServerClient()
  let createdId: string | null = null

  try {
    const staff = await requireInventoryPermission(supabase, ['create_products'])

    const name = ((formData.get('name') as string) || '').trim()
    const description = ((formData.get('description') as string) || '').trim() || null
    const barcode = ((formData.get('barcode') as string) || '').trim() || null
    const sku = ((formData.get('sku') as string) || '').trim() || null
    const rawPrice = parseFloat((formData.get('price') as string) || '0')
    const rawCost = parseFloat((formData.get('cost') as string) || '0')
    const rawQuantity = parseFloat((formData.get('quantity_available') as string) || '0')
    const rawLowStock = parseFloat((formData.get('low_stock_threshold') as string) || '0')
    const unitCode = ((formData.get('unit') as string) || 'unit').trim()
    const categoryId = ((formData.get('category_id') as string) || '').trim() || null
    const showInCatalog = formData.get('show_in_catalog') !== 'false'

    if (!name) {
      return { error: 'El nombre del producto es obligatorio.' }
    }
    if (isNaN(rawPrice) || rawPrice < 0) {
      return { error: 'El precio de venta debe ser un número válido mayor o igual a 0.' }
    }
    if (isNaN(rawCost) || rawCost < 0) {
      return { error: 'El costo debe ser un número válido mayor o igual a 0.' }
    }

    const unitDef = getUnitDefinition(unitCode)

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name,
        description,
        barcode,
        sku,
        price: rawPrice,
        cost: isNaN(rawCost) ? 0 : rawCost,
        quantity_available: isNaN(rawQuantity) ? 0 : rawQuantity,
        low_stock_threshold: isNaN(rawLowStock) || rawLowStock < 0 ? 0 : rawLowStock,
        unit: unitDef.code,
        unit_category: unitDef.category,
        category_id: categoryId,
        show_in_catalog: showInCatalog,
        created_by: staff.id,
        updated_by: staff.id,
      })
      .select('*')
      .single()

    if (insertError || !product) {
      return {
        error: 'Error al crear el producto: ' + (insertError?.message || 'Desconocido'),
      }
    }

    createdId = product.id

    // Process up to 3 image uploads
    const imageUrls: string[] = []
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`image_file_${i}`) as File | null
      if (file && file.size > 0) {
        const uploadedUrl = await uploadProductImageFile(supabase, file)
        imageUrls.push(uploadedUrl)
      }
    }

    if (imageUrls.length > 0) {
      const imageRows = imageUrls.slice(0, 3).map((url, idx) => ({
        product_id: product.id,
        image_url: url,
        display_order: idx,
        created_by: staff.id,
      }))
      const { error: imgErr } = await supabase
        .from('product_images')
        .insert(imageRows)
      if (imgErr) {
        console.error('[InventoryAction:createProduct] Error saving images:', imgErr)
      }
    }
  } catch (err: any) {
    console.error('[InventoryAction:createProduct] Unexpected error:', err)
    return { error: err.message || 'Error inesperado al crear el producto.' }
  }

  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function updateProductAction(
  productId: string,
  prevState: any,
  formData: FormData
) {
  const supabase = await createServerClient()

  try {
    const staff = await requireInventoryPermission(supabase, ['edit_products'])

    const name = ((formData.get('name') as string) || '').trim()
    const description = ((formData.get('description') as string) || '').trim() || null
    const barcode = ((formData.get('barcode') as string) || '').trim() || null
    const sku = ((formData.get('sku') as string) || '').trim() || null
    const rawPrice = parseFloat((formData.get('price') as string) || '0')
    const rawCost = parseFloat((formData.get('cost') as string) || '0')
    const rawQuantity = parseFloat((formData.get('quantity_available') as string) || '0')
    const rawLowStock = parseFloat((formData.get('low_stock_threshold') as string) || '0')
    const unitCode = ((formData.get('unit') as string) || 'unit').trim()
    const categoryId = ((formData.get('category_id') as string) || '').trim() || null
    const showInCatalog = formData.get('show_in_catalog') !== 'false'

    if (!name) {
      return { error: 'El nombre del producto es obligatorio.' }
    }
    if (isNaN(rawPrice) || rawPrice < 0) {
      return { error: 'El precio de venta debe ser un número válido mayor o igual a 0.' }
    }
    if (isNaN(rawCost) || rawCost < 0) {
      return { error: 'El costo debe ser un número válido mayor o igual a 0.' }
    }

    const unitDef = getUnitDefinition(unitCode)

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name,
        description,
        barcode,
        sku,
        price: rawPrice,
        cost: isNaN(rawCost) ? 0 : rawCost,
        quantity_available: isNaN(rawQuantity) ? 0 : rawQuantity,
        low_stock_threshold: isNaN(rawLowStock) || rawLowStock < 0 ? 0 : rawLowStock,
        unit: unitDef.code,
        unit_category: unitDef.category,
        category_id: categoryId,
        show_in_catalog: showInCatalog,
        updated_by: staff.id,
      })
      .eq('id', productId)

    if (updateError) {
      return { error: 'Error al actualizar el producto: ' + updateError.message }
    }

    // Handle images: keep existing URLs passed via `existing_images` + newly uploaded files (max 3 total)
    const keptUrls = (formData.getAll('existing_images') as string[])
      .map((u) => u.trim())
      .filter(Boolean)

    const newUrls: string[] = []
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`image_file_${i}`) as File | null
      if (file && file.size > 0) {
        const uploadedUrl = await uploadProductImageFile(supabase, file)
        newUrls.push(uploadedUrl)
      }
    }

    const finalUrls = [...keptUrls, ...newUrls].slice(0, 3)

    // Compare against current product_images to avoid unnecessary churn
    const { data: currentImgs } = await supabase
      .from('product_images')
      .select('image_url, display_order')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    const oldUrls = (currentImgs || []).map((img: any) => img.image_url)
    const imagesChanged =
      oldUrls.length !== finalUrls.length ||
      oldUrls.some((u: string, i: number) => u !== finalUrls[i])

    if (imagesChanged) {
      await supabase.from('product_images').delete().eq('product_id', productId)
      if (finalUrls.length > 0) {
        const imageRows = finalUrls.map((url, idx) => ({
          product_id: productId,
          image_url: url,
          display_order: idx,
          created_by: staff.id,
        }))
        await supabase.from('product_images').insert(imageRows)
      }

      // Log image change in product_history
      await supabase.from('product_history').insert({
        product_id: productId,
        action: 'updated',
        field_name: 'images',
        old_value: `${oldUrls.length} imagen(es)`,
        new_value: `${finalUrls.length} imagen(es)`,
        changed_by: staff.id,
      })
    }
  } catch (err: any) {
    console.error('[InventoryAction:updateProduct] Unexpected error:', err)
    return { error: err.message || 'Error inesperado al actualizar el producto.' }
  }

  revalidatePath('/inventory')
  revalidatePath(`/inventory/${productId}`)
  redirect('/inventory')
}

export async function updateProductInlineAction(
  productId: string,
  field: 'price' | 'cost' | 'quantity_available',
  value: number
) {
  const supabase = await createServerClient()
  try {
    const staff = await requireInventoryPermission(supabase, ['edit_products'])

    if (isNaN(value)) {
      return { error: 'El valor ingresado no es un número válido.' }
    }
    if ((field === 'price' || field === 'cost') && value < 0) {
      return { error: 'El precio y el costo no pueden ser negativos.' }
    }

    const { error } = await supabase
      .from('products')
      .update({
        [field]: value,
        updated_by: staff.id,
      })
      .eq('id', productId)

    if (error) {
      return { error: 'Error al actualizar: ' + error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado.' }
  }
}

export async function deleteProductAction(productId: string) {
  const supabase = await createServerClient()
  try {
    const staff = await requireInventoryPermission(supabase, ['delete_products'])

    const { error } = await supabase
      .from('products')
      .update({
        deleted: true,
        updated_by: staff.id,
      })
      .eq('id', productId)

    if (error) {
      return { error: 'Error al eliminar el producto: ' + error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado.' }
  }
}

export async function fetchProductHistoryAction(productId: string) {
  const supabase = await createServerClient()
  try {
    await requireInventoryPermission(supabase, [
      'view_products',
      'create_products',
      'edit_products',
      'delete_products',
    ])
    const history = await getProductHistory(supabase, productId)
    return { history }
  } catch (err: any) {
    return { error: err.message || 'Error al obtener el historial.', history: [] }
  }
}
