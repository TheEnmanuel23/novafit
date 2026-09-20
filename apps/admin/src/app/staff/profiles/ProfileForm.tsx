'use client'

import { useActionState } from 'react'
import { saveProfile } from '@/app/actions/rbac'

export default function ProfileForm({ 
  profile, 
  roles 
}: { 
  profile?: any, 
  roles: any[] 
}) {
  const [state, formAction, pending] = useActionState(saveProfile, null)

  const isSystem = profile?.is_system

  if (state?.success) {
    return (
      <div className="glass p-6 text-center flex flex-col gap-4 mt-6">
        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 className="text-xl font-bold">Perfil guardado</h2>
        <p className="text-sm text-muted-foreground">Los cambios se han aplicado correctamente.</p>
        
        <a href="/staff/profiles" className="btn btn-primary mt-4">
          Volver a Perfiles
        </a>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-6 mt-6" action={formAction}>
      {state?.error && (
        <div className="bg-destructive/20 text-destructive p-3 rounded text-sm border border-destructive/30">
          {state.error}
        </div>
      )}

      {profile && <input type="hidden" name="id" value={profile.id} />}

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Información General</h2>
        
        <div className="input-group">
          <label className="input-label" htmlFor="name">Nombre del Perfil *</label>
          <input 
            id="name" 
            name="name" 
            type="text" 
            className="input" 
            required 
            defaultValue={profile?.name} 
            disabled={isSystem}
            placeholder="Ej. Entrenador" 
          />
          {isSystem && <span className="text-xs text-destructive mt-1">El nombre de un perfil de sistema no puede modificarse.</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="description">Descripción</label>
          <input 
            id="description" 
            name="description" 
            type="text" 
            className="input" 
            defaultValue={profile?.description}
            placeholder="Ej. Permisos básicos para entrenadores" 
          />
        </div>
      </section>

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Permisos (Roles)</h2>
        <p className="text-xs text-muted-foreground mb-2">Selecciona qué acciones estarán permitidas para los empleados con este perfil.</p>
        
        <div className="grid grid-cols-1 gap-3">
          {roles.map((role) => {
            const hasRole = profile?.roles?.some((r: any) => r.id === role.id)
            // Global admin has all roles automatically, we can disable checkboxes but they should remain checked
            const isDisabled = isSystem && profile?.name === 'Global Admin'
            return (
              <label key={role.id} className={`cursor-pointer ${isDisabled ? 'opacity-70' : ''}`}>
                <input 
                  type="checkbox" 
                  name="roles" 
                  value={role.id} 
                  defaultChecked={hasRole || isDisabled} 
                  disabled={isDisabled}
                  className="peer sr-only" 
                />
                <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all flex flex-col">
                  <span className="font-bold text-sm">{role.name}</span>
                  {role.description && (
                    <span className="text-xs text-muted-foreground mt-1">{role.description}</span>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </section>

      <button type="submit" className="btn btn-primary btn-lg mt-4 shadow-lg shadow-accent/20" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar Perfil'}
      </button>
    </form>
  )
}
