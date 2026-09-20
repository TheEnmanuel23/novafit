'use client'

import { useActionState } from 'react'
import { updateStaffProfile } from '@/app/actions/staff'

export default function StaffEditForm({ 
  staff, 
  profiles 
}: { 
  staff: any, 
  profiles: any[] 
}) {
  const [state, formAction, pending] = useActionState(updateStaffProfile, null)
  
  const isTargetGlobalAdmin = staff.profile?.name === 'Global Admin'

  if (state?.success) {
    return (
      <div className="glass p-6 text-center flex flex-col gap-4">
        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 className="text-xl font-bold">Cambios Guardados</h2>
        <p className="text-sm text-muted-foreground">El perfil del empleado ha sido actualizado correctamente.</p>
        
        <a href={`/staff/${staff.id}`} className="btn btn-primary mt-4">
          Volver al Perfil
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

      <input type="hidden" name="staff_id" value={staff.id} />

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Información del Empleado</h2>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-lg">{staff.nombre}</span>
          <span className="text-sm text-muted-foreground">@{staff.username}</span>
        </div>
      </section>

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Perfil Asignado</h2>
        
        {isTargetGlobalAdmin ? (
          <div className="bg-destructive/10 text-destructive p-3 rounded text-sm border border-destructive/20 mb-2">
            No se puede modificar el nivel de acceso de un administrador global.
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-2">Selecciona el nuevo nivel de acceso para este empleado.</p>
        )}
        
        <div className="grid grid-cols-1 gap-3">
          {profiles.map((profile) => (
            <label key={profile.id} className={isTargetGlobalAdmin ? "cursor-not-allowed opacity-70" : "cursor-pointer"}>
              <input 
                type="radio" 
                name="profile_id" 
                value={profile.id} 
                defaultChecked={staff.profile_id === profile.id}
                className="peer sr-only" 
                required 
                disabled={isTargetGlobalAdmin}
              />
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

      {!isTargetGlobalAdmin && (
        <button type="submit" className="btn btn-primary btn-lg mt-4 shadow-lg shadow-accent/20" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      )}
    </form>
  )
}
