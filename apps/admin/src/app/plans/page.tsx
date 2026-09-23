import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'

export default async function PlansPage() {
  const supabase = await createClient()

  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_members'))) {
    redirect('/dashboard')
  }

  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true })

  return (
    <div className="app-container">
      <header className="page-header items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold">Planes</h1>
          <p className="text-muted-foreground text-xs">Gestión de paquetes de visitas</p>
        </div>
        <Link href="/plans/new" className="btn btn-primary h-10 px-4 text-sm rounded-lg shadow-lg shadow-accent/20">
          + Nuevo Plan
        </Link>
      </header>

      <main className="page-content mt-6 flex flex-col gap-4 pb-24">
        {error ? (
          <div className="bg-error/10 text-error p-4 rounded-lg text-sm">
            Error al cargar planes: {error.message}
          </div>
        ) : plans?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm glass rounded-xl">
            No hay planes configurados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans?.map((plan) => (
              <div key={plan.id} className={`glass p-5 rounded-xl border-l-4 ${plan.active ? 'border-l-success' : 'border-l-error'} flex flex-col gap-3 relative`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{plan.description}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${plan.active ? 'badge-active' : 'badge-expired'}`}>
                        {plan.active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-xs text-muted-foreground">{plan.visits_included} visitas</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xl text-accent">C$ {plan.price}</div>
                    <Link href={`/plans/${plan.id}`} className="text-xs text-accent hover:underline mt-1 block">
                      Editar
                    </Link>
                  </div>
                </div>
                
                <div className="h-px bg-white/5 w-full my-1"></div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Expira en {plan.expiration_days} días</span>
                  <span>Balance Max: {plan.max_balance}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav currentPath="/plans" />
    </div>
  )
}
