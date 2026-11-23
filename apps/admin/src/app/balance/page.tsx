import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getSales,
  getPaymentMethods,
} from '@novafit/supabase'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { BottomNav } from '@/components/BottomNav'
import { BalanceView } from './BalanceView'

export default async function BalancePage() {
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
    (await hasRole(staff, 'view_reports'))

  if (!canView) {
    redirect('/dashboard')
  }

  const canEditSales = isGlobal || (await hasRole(staff, 'create_sales'))
  const todayYMD = getTodayYYYYMMDD()

  const [sales, paymentMethods] = await Promise.all([
    getSales(supabase, { limit: 1000 }),
    getPaymentMethods(supabase),
  ])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28">
        <BalanceView
          initialSales={sales}
          paymentMethods={paymentMethods}
          defaultTodayYMD={todayYMD}
          canEditSales={canEditSales}
        />
      </div>

      <BottomNav currentPath="/balance" />
    </div>
  )
}

