import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'

export default async function NewMemberPage() {
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_members'))) {
    redirect('/dashboard')
  }

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/members" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo Miembro</h1>
          <p className="text-muted-foreground text-xs">Registro y asignación de plan</p>
        </div>
      </header>

      <main className="page-content mt-6 max-w-md mx-auto w-full">
        <form className="flex flex-col gap-6" action={async (formData) => {
          'use server'
          // Server action placeholder for creating member
          console.log(formData)
        }}>
          
          <section className="glass p-5 flex flex-col gap-4">
            <h2 className="section-title !mb-0">Datos Personales</h2>
            
            <div className="input-group">
              <label className="input-label" htmlFor="nombre">Nombre Completo *</label>
              <input id="nombre" name="nombre" type="text" className="input" required placeholder="Ej. Juan Pérez" />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="telefono">Teléfono (Opcional)</label>
              <input id="telefono" name="telefono" type="tel" className="input" placeholder="Ej. 8888-8888" />
            </div>
          </section>

          <section className="glass p-5 flex flex-col gap-4">
            <h2 className="section-title !mb-0">Plan Inicial</h2>
            <p className="text-xs text-muted-foreground mb-2">Selecciona el paquete de visitas inicial para este miembro.</p>
            
            {/* Plan selection will be fetched from DB, using placeholders for now */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="radio" name="plan_id" value="1" className="peer sr-only" required />
                <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all">
                  <div className="font-bold text-sm">Día</div>
                  <div className="text-xs text-muted-foreground mt-1">1 visita</div>
                  <div className="font-semibold text-accent mt-2">C$ 50</div>
                </div>
              </label>
              
              <label className="cursor-pointer">
                <input type="radio" name="plan_id" value="2" className="peer sr-only" required />
                <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all">
                  <div className="font-bold text-sm">Quincenal</div>
                  <div className="text-xs text-muted-foreground mt-1">15 visitas</div>
                  <div className="font-semibold text-accent mt-2">C$ 500</div>
                </div>
              </label>
              
              <label className="cursor-pointer">
                <input type="radio" name="plan_id" value="3" className="peer sr-only" required />
                <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all">
                  <div className="font-bold text-sm">Mensual</div>
                  <div className="text-xs text-muted-foreground mt-1">30 visitas</div>
                  <div className="font-semibold text-accent mt-2">C$ 800</div>
                </div>
              </label>
            </div>
          </section>

          <button type="submit" className="btn btn-primary btn-lg mt-4 shadow-lg shadow-accent/20">
            Registrar y Generar QR
          </button>
        </form>
      </main>
    </div>
  )
}
