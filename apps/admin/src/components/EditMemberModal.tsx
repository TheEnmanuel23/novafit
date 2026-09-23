'use client'

import { useState, useActionState, useEffect } from 'react'
import { updateMemberAction } from '@/app/actions/members'

export function EditMemberModal({ member }: { member: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState(updateMemberAction, null)

  // Close modal on success
  useEffect(() => {
    if (state?.success) {
      setIsOpen(false)
    }
  }, [state])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors"
        title="Editar Miembro"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Editar Miembro</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="member_id" value={member.member_id} />
              
              {state?.error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  {state.error}
                </div>
              )}

              <div className="input-group">
                <label className="input-label" htmlFor="nombre">Nombre Completo *</label>
                <input 
                  id="nombre" 
                  name="nombre" 
                  type="text" 
                  defaultValue={member.nombre}
                  className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="telefono">Teléfono (Opcional)</label>
                <input 
                  id="telefono" 
                  name="telefono" 
                  type="tel" 
                  inputMode="numeric"
                  defaultValue={member.telefono || ''}
                  className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9-]/g, '')
                  }}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="username">Usuario (ID)</label>
                <input 
                  id="username" 
                  name="username" 
                  type="text" 
                  defaultValue={member.username}
                  className="input bg-black/20 border-white/5 text-muted-foreground rounded-xl uppercase cursor-not-allowed" 
                  readOnly
                  disabled
                />
                <p className="text-[10px] text-muted-foreground mt-1">El ID de usuario no puede ser modificado.</p>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary flex-1 h-12 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="btn btn-primary flex-1 h-12 rounded-xl">
                  {pending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
