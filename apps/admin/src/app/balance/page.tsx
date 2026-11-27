import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getSales,
  getExpenses,
  getPaymentMethods,
  getCashRegisterSessions,
  getOpenCashRegisterSession,
  getStaffOptionsForSales,
} from '@novafit/supabase'
import {
  APP_TIMEZONE,
  getTodayYYYYMMDD,
  toTimezoneYYYYMMDD,
} from '@novafit/supabase/src/utils/date'
import { BottomNav } from '@/components/BottomNav'
import { BalanceView } from './BalanceView'

export default async function BalancePage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)
  const canViewFullBalance = isGlobal || (await hasRole(staff, 'view_balance'))
  const canManageCash = isGlobal || (await hasRole(staff, 'manage_cash_register'))

  if (!canViewFullBalance && !canManageCash) {
    redirect('/dashboard')
  }

  const canEditSales = isGlobal || (await hasRole(staff, 'create_sales'))
  const canDeleteSales = isGlobal || (await hasRole(staff, 'delete_sales'))
  const canCreateExpenses = isGlobal || (await hasRole(staff, 'create_expenses'))
  const canDeleteExpenses = isGlobal || (await hasRole(staff, 'delete_expenses'))

  const todayYMD = getTodayYYYYMMDD()

  const [allSales, allExpenses, paymentMethods, allCashSessions, openSession, staffList] =
    await Promise.all([
      getSales(supabase, { limit: canViewFullBalance ? 1000 : 250 }),
      getExpenses(supabase, { limit: canViewFullBalance ? 1000 : 250 }),
      getPaymentMethods(supabase),
      getCashRegisterSessions(supabase, canViewFullBalance ? 200 : 25),
      getOpenCashRegisterSession(supabase),
      canViewFullBalance ? getStaffOptionsForSales(supabase) : Promise.resolve([]),
    ])

  // Server-side scoping: users without `view_balance` only receive today's own sales/expenses
  // and today's own / currently open cash register shift (never historical totals).
  const sales = canViewFullBalance
    ? allSales
    : allSales.filter((sale) => {
        const isToday = toTimezoneYYYYMMDD(sale.sale_date, APP_TIMEZONE) === todayYMD
        const isOwnSale =
          sale.assigned_staff_id === staff.id || sale.created_by === staff.id
        return isToday && isOwnSale
      })

  const expenses = canViewFullBalance
    ? allExpenses
    : allExpenses.filter((exp) => {
        const isToday = toTimezoneYYYYMMDD(exp.expense_date, APP_TIMEZONE) === todayYMD
        const isOwnExpense =
          exp.assigned_staff_id === staff.id || exp.created_by === staff.id
        return isToday && isOwnExpense
      })

  const isOtherStaffOpenShift = Boolean(
    !canViewFullBalance &&
      openSession &&
      openSession.opened_by &&
      openSession.opened_by !== staff.id
  )

  const visibleOpenSession = isOtherStaffOpenShift ? null : openSession
  const otherStaffOpenShift =
    isOtherStaffOpenShift && openSession
      ? {
          openedByName: openSession.opened_by_staff?.name || 'otro recepcionista',
          openedAt: openSession.opened_at,
        }
      : null

  const cashSessions = canViewFullBalance
    ? allCashSessions
    : allCashSessions.filter((session) => {
        const isOwnSession =
          session.opened_by === staff.id || session.closed_by === staff.id
        if (!isOwnSession) return false
        if (session.status === 'open') return true
        const refDate = session.closed_at || session.opened_at
        return toTimezoneYYYYMMDD(refDate, APP_TIMEZONE) === todayYMD
      })

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28">
        <BalanceView
          initialSales={sales}
          initialExpenses={expenses}
          paymentMethods={paymentMethods}
          initialCashSessions={cashSessions}
          openCashSession={visibleOpenSession}
          otherStaffOpenShift={otherStaffOpenShift}
          staffList={staffList}
          defaultTodayYMD={todayYMD}
          canViewFullBalance={canViewFullBalance}
          canEditSales={canEditSales}
          canDeleteSales={canDeleteSales}
          canCreateExpenses={canCreateExpenses}
          canDeleteExpenses={canDeleteExpenses}
          canManageCash={canManageCash}
        />
      </div>

      <BottomNav currentPath="/balance" />
    </div>
  )
}
