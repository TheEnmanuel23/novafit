import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffById, getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import ResetPasswordButton from './ResetPasswordButton'

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_staff'))) {
    redirect('/dashboard')
  }

  const staff = await getStaffById(supabase, id)
  
  if (!staff) {
    notFound()
  }

  const isGlobal = await isGlobalAdmin(currentUser)

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/staff" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Detalle de Staff</h1>
          <p className="text-muted-foreground text-xs">Información del empleado</p>
        </div>
        {isGlobal && (
          <div className="flex items-center gap-2">
            <ResetPasswordButton staffId={staff.id} />
            <Link href={`/staff/${id}/edit`} className="btn bg-surface hover:bg-surface-hover border border-border btn-sm">
              Editar
            </Link>
          </div>
        )}
      </header>

      <main className="page-content mt-6 max-w-md mx-auto w-full flex flex-col gap-6">
        
        <section className="glass p-5 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center text-3xl font-bold uppercase">
            {staff.nombre.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{staff.nombre}</h2>
            <p className="text-muted-foreground mt-1">@{staff.username}</p>
          </div>
          <span className="badge badge-active mt-2">{staff.profile.name}</span>
        </section>

        <section className="glass p-5 flex flex-col gap-4">
          <h2 className="section-title !mb-0">Información de Contacto</h2>
          
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Correo Electrónico</span>
            <span className="font-medium">{staff.email || 'No especificado'}</span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Fecha de Registro</span>
            <span className="font-medium">{new Date(staff.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </section>

        <section className="glass p-5 flex flex-col gap-2">
          <h2 className="section-title !mb-0">Perfil Asignado</h2>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-base font-medium">{staff.profile.name}</span>
            {staff.profile.description ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{staff.profile.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin descripción de perfil</p>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}
