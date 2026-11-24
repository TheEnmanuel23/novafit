import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProductCategory,
  ProductHistory,
  ProductUnitCategory,
  ProductWithDetails,
} from '@novafit/types'

export interface UnitDefinition {
  code: string
  label: string
  shortLabel: string
  category: ProductUnitCategory
}

export interface UnitGroupDefinition {
  category: ProductUnitCategory
  label: string
  units: UnitDefinition[]
}

export const PRODUCT_UNIT_GROUPS: UnitGroupDefinition[] = [
  {
    category: 'count',
    label: 'Conteo',
    units: [
      { code: 'unit', label: 'Unidad', shortLabel: 'Unidad', category: 'count' },
      { code: 'box', label: 'Caja', shortLabel: 'Caja', category: 'count' },
      { code: 'pack', label: 'Paquete', shortLabel: 'Paquete', category: 'count' },
      { code: 'dozen', label: 'Docena', shortLabel: 'Docena', category: 'count' },
      { code: 'pair', label: 'Par', shortLabel: 'Par', category: 'count' },
    ],
  },
  {
    category: 'weight',
    label: 'Peso',
    units: [
      { code: 'kg', label: 'Kilogramo (kg)', shortLabel: 'kg', category: 'weight' },
      { code: 'lb', label: 'Libra (lb)', shortLabel: 'lb', category: 'weight' },
      { code: 'g', label: 'Gramo (g)', shortLabel: 'g', category: 'weight' },
      { code: 'oz', label: 'Onza (oz)', shortLabel: 'oz', category: 'weight' },
      { code: 'mg', label: 'Miligramo (mg)', shortLabel: 'mg', category: 'weight' },
    ],
  },
  {
    category: 'volume',
    label: 'Volumen',
    units: [
      { code: 'l', label: 'Litro (L)', shortLabel: 'L', category: 'volume' },
      { code: 'ml', label: 'Mililitro (ml)', shortLabel: 'ml', category: 'volume' },
      { code: 'gal', label: 'Galón (gal)', shortLabel: 'gal', category: 'volume' },
      { code: 'fl_oz', label: 'Onza líquida (fl oz)', shortLabel: 'fl oz', category: 'volume' },
    ],
  },
  {
    category: 'length',
    label: 'Longitud',
    units: [
      { code: 'm', label: 'Metro (m)', shortLabel: 'm', category: 'length' },
      { code: 'cm', label: 'Centímetro (cm)', shortLabel: 'cm', category: 'length' },
      { code: 'mm', label: 'Milímetro (mm)', shortLabel: 'mm', category: 'length' },
      { code: 'in', label: 'Pulgada (in)', shortLabel: 'in', category: 'length' },
      { code: 'ft', label: 'Pie (ft)', shortLabel: 'ft', category: 'length' },
      { code: 'yd', label: 'Yarda (yd)', shortLabel: 'yd', category: 'length' },
    ],
  },
  {
    category: 'area',
    label: 'Área',
    units: [
      { code: 'm2', label: 'Metro cuadrado (m²)', shortLabel: 'm²', category: 'area' },
      { code: 'cm2', label: 'Centímetro cuadrado (cm²)', shortLabel: 'cm²', category: 'area' },
      { code: 'ft2', label: 'Pie cuadrado (ft²)', shortLabel: 'ft²', category: 'area' },
    ],
  },
]

export function getUnitDefinition(unitCode: string): UnitDefinition {
  for (const group of PRODUCT_UNIT_GROUPS) {
    const found = group.units.find((u) => u.code === unitCode)
    if (found) return found
  }
  return PRODUCT_UNIT_GROUPS[0].units[0]
}

export async function getProducts(
  supabase: SupabaseClient
): Promise<ProductWithDetails[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:product_categories (*),
      images:product_images (*)
    `
    )
    .eq('deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    ...row,
    price: Number(row.price ?? 0),
    cost: Number(row.cost ?? 0),
    quantity_available: Number(row.quantity_available ?? 0),
    low_stock_threshold: Number(row.low_stock_threshold ?? 0),
    category: row.category || null,
    images: [...(row.images || [])].sort(
      (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  })) as ProductWithDetails[]
}

export async function getProductById(
  supabase: SupabaseClient,
  id: string
): Promise<ProductWithDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:product_categories (*),
      images:product_images (*)
    `
    )
    .eq('id', id)
    .eq('deleted', false)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch product: ${error.message}`)
  }
  if (!data) return null

  return {
    ...data,
    price: Number(data.price ?? 0),
    cost: Number(data.cost ?? 0),
    quantity_available: Number(data.quantity_available ?? 0),
    low_stock_threshold: Number(data.low_stock_threshold ?? 0),
    category: (data as any).category || null,
    images: [...((data as any).images || [])].sort(
      (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  } as ProductWithDetails
}

export async function getProductCategories(
  supabase: SupabaseClient
): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch product categories: ${error.message}`)
  }

  return (data || []) as ProductCategory[]
}

export async function getProductHistory(
  supabase: SupabaseClient,
  productId: string
): Promise<ProductHistory[]> {
  const { data, error } = await supabase
    .from('product_history')
    .select(
      `
      *,
      staff:staff!changed_by (
        id,
        name,
        username
      )
    `
    )
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch product history: ${error.message}`)
  }

  return (data || []) as ProductHistory[]
}

