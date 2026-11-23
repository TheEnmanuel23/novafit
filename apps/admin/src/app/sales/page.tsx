import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getProducts,
  getProductCategories,
  getPaymentMethods,
  getClientsForSales,
  getStaffOptionsForSales,
  getSales,
} from '@novafit/supabase'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { BottomNav } from '@/components/BottomNav'
import { SalesView } from './SalesView'

export default async function SalesPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)
  const canView =
    isGlobal ||
    (await hasRole(staff, 'view_sales')) ||
    (await hasRole(staff, 'create_sales')) ||
    (await hasRole(staff, 'delete_sales'))

  if (!canView) {
    redirect('/dashboard')
  }

  const canCreate = isGlobal || (await hasRole(staff, 'create_sales'))
  const canDelete = isGlobal || (await hasRole(staff, 'delete_sales'))

  const todayYMD = getTodayYYYYMMDD()

  const [
    products,
    categories,
    paymentMethods,
    clients,
    staffList,
    recentSales,
  ] = await Promise.all([
    getProducts(supabase),
    getProductCategories(supabase),
    getPaymentMethods(supabase),
    getClientsForSales(supabase),
    getStaffOptionsForSales(supabase),
    getSales(supabase, { limit: 100 }),
  ])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-32">
        <SalesView
          initialProducts={products}
          initialCategories={categories}
          paymentMethods={paymentMethods}
          clients={clients}
          staffList={staffList}
          currentStaff={{
            id: staff.id,
            name: staff.name,
            username: staff.username,
          }}
          initialSales={recentSales}
          defaultTodayYMD={todayYMD}
          permissions={{
            canView,
            canCreate,
            canDelete,
          }}
        />
      </div>

      <BottomNav currentPath="/sales" />
    </div>
  )
}

