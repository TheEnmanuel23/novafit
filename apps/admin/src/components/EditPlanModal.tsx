'use client'

import { useState, useActionState, useEffect } from 'react'
import { parseISO, addDays, differenceInDays, format } from 'date-fns'
import type { MemberPlan } from '@novafit/types'
import { updatePlanAction } from '@/app/actions/members'

export function EditPlanModal({ memberPlan, memberId }: { memberPlan: MemberPlan, memberId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState(updatePlanAction, null)

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false)
    }
  }, [state])

  const defaultStart = (memberPlan as any).starts_at ? format(parseISO((memberPlan as any).starts_at), 'yyyy-MM-dd') : ''
  const defaultEnd = memberPlan.expiration_date ? format(parseISO(memberPlan.expiration_date), 'yyyy-MM-dd') : ''

  let initialDuration = (memberPlan as any).plan?.expiration_days
  if (defaultStart && defaultEnd) {
    initialDuration = differenceInDays(parseISO(defaultEnd), parseISO(defaultStart)) + 1
  }

  const [startsAt, setStartsAt] = useState(defaultStart)
  const [expiresAt, setExpiresAt] = useState(defaultEnd)
  const [durationDays, setDurationDays] = useState(initialDuration)

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value
    setStartsAt(newStart)
    if (newStart && durationDays > 0) {
      const newEndDate = addDays(parseISO(newStart), durationDays - 1)
      setExpiresAt(format(newEndDate, 'yyyy-MM-dd'))
    }
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10) || 0
    setDurationDays(newDuration)
    if (startsAt && newDuration > 0) {
      const newEndDate = addDays(parseISO(startsAt), newDuration - 1)
      setExpiresAt(format(newEndDate, 'yyyy-MM-dd'))
    }
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value
    setExpiresAt(newEnd)
    if (startsAt && newEnd) {
      setDurationDays(differenceInDays(parseISO(newEnd), parseISO(startsAt)) + 1)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors"
        title="Editar Plan"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Editar Plan Activo</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="member_id" value={memberId} />
              <input type="hidden" name="plan_id" value={memberPlan.id} />
              
              {state?.error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  {state.error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="starts_at">Fecha de Inicio</label>
                  <input 
                    id="starts_at"
                    name="starts_at"
                    type="date" 
                    value={startsAt}
                    onChange={handleStartChange}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="expiration_date">Fecha de Fin</label>
                  <input 
                    id="expiration_date"
                    name="expiration_date"
                    type="date" 
                    value={expiresAt}
                    onChange={handleEndChange}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="duration_days" title="Días de vigencia del plan">Vigencia (Días)</label>
                  <input 
                    id="duration_days"
                    type="number" 
                    min="1"
                    value={durationDays}
                    onChange={handleDurationChange}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="visits_purchased">Días Comprados</label>
                  <input 
                    id="visits_purchased"
                    name="visits_purchased"
                    type="number" 
                    min="1"
                    defaultValue={memberPlan.visits_purchased}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="visits_used">Días Usados</label>
                  <input 
                    id="visits_used"
                    name="visits_used"
                    type="number" 
                    min="0"
                    defaultValue={memberPlan.visits_used}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label text-xs" htmlFor="status">Estado del Plan</label>
                <div className="relative">
                  <select 
                    id="status" 
                    name="status" 
                    defaultValue={memberPlan.status}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm w-full appearance-none pr-10"
                  >
                    <option value="active">Activo</option>
                    <option value="expired">Expirado (Desactivar)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Si cambias el estado a Expirado, este plan se desactivará inmediatamente.</p>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary flex-1 h-12 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="btn btn-primary flex-1 h-12 rounded-xl">
                  {pending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
