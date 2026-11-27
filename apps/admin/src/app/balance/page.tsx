import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getSales,
  getPaymentMethods,
  getCashRegisterSessions,
  getOpenCashRegisterSession,
  getStaffOptionsForSales,
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
    (await hasRole(staff, 'manage_cash_register')) ||
    (await hasRole(staff, 'view_reports'))

  if (!canView) {
    redirect('/dashboard')
  }

  const canEditSales = isGlobal || (await hasRole(staff, 'create_sales'))
  const canDeleteSales = isGlobal || (await hasRole(staff, 'delete_sales'))
  const canManageCash =
    isGlobal ||
    (await hasRole(staff, 'manage_cash_register')) ||
    (await hasRole(staff, 'create_sales'))

  const todayYMD = getTodayYYYYMMDD()

  const [sales, paymentMethods, cashSessions, openSession, staffList] = await Promise.all([
    getSales(supabase, { limit: 1000 }),
    getPaymentMethods(supabase),
    getCashRegisterSessions(supabase, 200),
    getOpenCashRegisterSession(supabase),
    getStaffOptionsForSales(supabase),
  ])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28">
        <BalanceView
          initialSales={sales}
          paymentMethods={paymentMethods}
          initialCashSessions={cashSessions}
          openCashSession={openSession}
          staffList={staffList}
          defaultTodayYMD={todayYMD}
          canEditSales={canEditSales}
          canDeleteSales={canDeleteSales}
          canManageCash={canManageCash}
        />
      </div>

      <BottomNav currentPath="/balance" />
    </div>
  )
}
