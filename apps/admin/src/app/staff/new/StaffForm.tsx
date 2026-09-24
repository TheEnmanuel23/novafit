'use client'

import { useActionState } from 'react'
import { createStaffAccount } from '@/app/actions/staff'

export default function StaffForm({ profiles }: { profiles: any[] }) {
  const [state, formAction, pending] = useActionState(createStaffAccount, null)

  if (state?.success) {
    return (
      <div className="glass p-6 text-center flex flex-col gap-4">
        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 className="text-xl font-bold">{state.message}</h2>
        <p className="text-sm text-muted-foreground">Entregue esta contraseña temporal al empleado. Se le pedirá cambiarla al iniciar sesión.</p>
        
        <div className="bg-background p-4 rounded border border-border mt-2 relative group">
          <span className="font-mono text-lg tracking-wider text-accent">{state.temporaryPassword}</span>
        </div>
        
        <a href="/staff" className="btn btn-primary mt-4">
          Volver a Staff
        </a>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-6" action={formAction}>
      {state?.error && (
        <div className="bg-destructive/20 text-destructive p-3 rounded text-sm border border-destructive/30">
          {state.error}
        </div>
      )}

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Datos del Empleado</h2>
        
        <div className="input-group">
          <label className="input-label" htmlFor="name">Nombre Completo *</label>
          <input id="name" name="name" type="text" className="input" required placeholder="Ej. Ana Martínez" />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="username">Usuario *</label>
          <input id="username" name="username" type="text" className="input" required placeholder="Ej. amartinez" />
          <span className="text-xs text-muted-foreground mt-1">Este usuario se usará para iniciar sesión.</span>
        </div>
      </section>

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Perfil y Permisos</h2>
        <p className="text-xs text-muted-foreground mb-2">El perfil define los permisos de acceso en el panel.</p>
        
        <div className="grid grid-cols-1 gap-3">
          {profiles.map((profile) => (
            <label key={profile.id} className="cursor-pointer">
              <input type="radio" name="profile_id" value={profile.id} className="peer sr-only" required />
              <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all flex flex-col">
                <span className="font-bold text-sm">{profile.name}</span>
                {profile.description && (
                  <span className="text-xs text-muted-foreground mt-1">{profile.description}</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>

      <button type="submit" className="btn btn-primary btn-lg mt-4 shadow-lg shadow-accent/20" disabled={pending}>
        {pending ? 'Creando cuenta...' : 'Crear Cuenta de Staff'}
      </button>
    </form>
  )
}
