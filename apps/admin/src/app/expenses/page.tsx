import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStaff,
  hasRole,
  isGlobalAdmin,
  getExpenseCategories,
  getExpenses,
  getPaymentMethods,
  getStaffOptionsForSales,
} from '@novafit/supabase'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { BottomNav } from '@/components/BottomNav'
import { ExpensesView } from './ExpensesView'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)

  if (!staff) {
    redirect('/login')
  }

  const isGlobal = await isGlobalAdmin(staff)
  const canView =
    isGlobal ||
    (await hasRole(staff, 'view_expenses')) ||
    (await hasRole(staff, 'create_expenses')) ||
    (await hasRole(staff, 'delete_expenses'))

  if (!canView) {
    redirect('/dashboard')
  }

  const canCreate = isGlobal || (await hasRole(staff, 'create_expenses'))
  const canDelete = isGlobal || (await hasRole(staff, 'delete_expenses'))
  const todayYMD = getTodayYYYYMMDD()

  const [categories, paymentMethods, staffList, expenses] = await Promise.all([
    getExpenseCategories(supabase),
    getPaymentMethods(supabase),
    getStaffOptionsForSales(supabase),
    getExpenses(supabase, { limit: 250 }),
  ])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-32">
        <ExpensesView
          initialCategories={categories}
          paymentMethods={paymentMethods}
          staffList={staffList}
          currentStaff={{
            id: staff.id,
            name: staff.name,
            username: staff.username,
          }}
          initialExpenses={expenses}
          defaultTodayYMD={todayYMD}
          permissions={{
            canView,
            canCreate,
            canDelete,
          }}
        />
      </div>

      <BottomNav currentPath="/expenses" />
    </div>
  )
}

