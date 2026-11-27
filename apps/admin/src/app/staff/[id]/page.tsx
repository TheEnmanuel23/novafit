import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffById, getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import { formatLongDate } from '@novafit/supabase/src/utils/date'
import ResetPasswordButton from './ResetPasswordButton'
import ToggleStaffStatusButton from './ToggleStaffStatusButton'

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
  const isActive = staff.is_active !== false
  const canToggleStatus =
    isGlobal &&
    staff.id !== currentUser.id &&
    staff.profile.name !== 'Global Admin'

  return (
    <div className="app-container">
      <header className="page-header items-center gap-3 border-b border-border pb-4 flex-wrap">
        <Link href="/staff" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1 min-w-[140px]">
          <h1 className="text-xl font-bold">Detalle de Staff</h1>
          <p className="text-muted-foreground text-xs">Información del empleado</p>
        </div>
        {isGlobal && (
          <div className="flex items-center flex-wrap gap-2">
            {canToggleStatus && (
              <ToggleStaffStatusButton
                staffId={staff.id}
                staffName={staff.name}
                isActive={isActive}
              />
            )}
            <ResetPasswordButton staffId={staff.id} />
            <Link href={`/staff/${id}/edit`} className="btn bg-surface hover:bg-surface-hover border border-border btn-sm">
              Editar
            </Link>
          </div>
        )}
      </header>

      <main className="page-content mt-6 max-w-md mx-auto w-full flex flex-col gap-6">
        {!isActive && (
          <div className="rounded-2xl bg-error/15 border border-error/30 px-4 py-3 text-xs text-error font-medium text-center">
            Esta cuenta está desactivada. El empleado no puede iniciar sesión ni acceder al sistema.
          </div>
        )}

        <section className="glass p-5 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center text-3xl font-bold uppercase">
            {staff.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{staff.name}</h2>
            <p className="text-muted-foreground mt-1">@{staff.username}</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-active">{staff.profile.name}</span>
            {isActive ? (
              <span className="badge badge-active">Activo</span>
            ) : (
              <span className="badge badge-expired">Inactivo</span>
            )}
          </div>
        </section>

        <section className="glass p-5 flex flex-col gap-4">
          <h2 className="section-title !mb-0">Información de Contacto</h2>
          
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Correo Electrónico</span>
            <span className="font-medium">{staff.email || 'No especificado'}</span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Fecha de Registro</span>
            <span className="font-medium">{formatLongDate(staff.created_at)}</span>
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
