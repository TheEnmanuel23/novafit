import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getProductCategories,
} from '@novafit/supabase'
import { ProductForm } from '@/components/ProductForm'

export default async function NewProductPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)
  const canCreate = isGlobal || (await hasRole(staff, 'create_products'))

  if (!canCreate) {
    redirect('/inventory')
  }

  const canEdit = isGlobal || (await hasRole(staff, 'edit_products'))
  const canDelete = isGlobal || (await hasRole(staff, 'delete_products'))

  const categories = await getProductCategories(supabase)

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-20">
        <header className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <Link
            href="/inventory"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors"
            aria-label="Volver al inventario"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Nuevo producto</h1>
        </header>

        <ProductForm
          initialCategories={categories}
          permissions={{
            canCreate,
            canEdit,
            canDelete,
          }}
        />
      </div>
    </div>
  )
}

