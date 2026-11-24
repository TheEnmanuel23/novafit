import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getProducts,
  getProductCategories,
} from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'
import { InventoryView } from './InventoryView'

export default async function InventoryPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)
  const canView =
    isGlobal ||
    (await hasRole(staff, 'view_products')) ||
    (await hasRole(staff, 'create_products')) ||
    (await hasRole(staff, 'edit_products')) ||
    (await hasRole(staff, 'delete_products'))

  if (!canView) {
    redirect('/dashboard')
  }

  const canCreate = isGlobal || (await hasRole(staff, 'create_products'))
  const canEdit = isGlobal || (await hasRole(staff, 'edit_products'))
  const canDelete = isGlobal || (await hasRole(staff, 'delete_products'))

  const [products, categories] = await Promise.all([
    getProducts(supabase),
    getProductCategories(supabase),
  ])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28">
        <InventoryView
          initialProducts={products}
          initialCategories={categories}
          permissions={{
            canView,
            canCreate,
            canEdit,
            canDelete,
          }}
        />
      </div>

      <BottomNav currentPath="/inventory" />
    </div>
  )
}

