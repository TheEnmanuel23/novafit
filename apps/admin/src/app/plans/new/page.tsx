import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { PlanForm } from '@/components/PlanForm'

export default async function NewPlanPage() {
  const supabase = await createClient()

  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_members'))) {
    redirect('/dashboard')
  }

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/plans" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo Plan</h1>
          <p className="text-muted-foreground text-xs">Crear un paquete de visitas</p>
        </div>
      </header>

      <main className="page-content mt-6 max-w-md mx-auto w-full pb-24">
        <PlanForm />
      </main>
    </div>
  )
}
