'use client'

import { useState, useActionState, useEffect } from 'react'
import type { Plan } from '@novafit/types'
import { assignPlanAction } from '@/app/actions/members'

export function AssignPlanModal({ memberId, plans }: { memberId: string, plans: Plan[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState(assignPlanAction, null)
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [customVisits, setCustomVisits] = useState<number>(0)
  const [customDays, setCustomDays] = useState<number>(0)

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false)
      setSelectedPlanId('')
    }
  }, [state])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setCustomPrice(plan.price)
      setCustomVisits(plan.visits_included)
      setCustomDays(plan.expiration_days)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Asignar Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Asignar Nuevo Plan</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="member_id" value={memberId} />
              
              {state?.error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  {state.error}
                </div>
              )}

              {plans.length === 0 ? (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  No hay planes activos disponibles.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {plans.map((plan) => (
                    <label key={plan.id} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="plan_id" 
                        value={plan.id} 
                        className="peer sr-only" 
                        required 
                        checked={selectedPlanId === plan.id}
                        onChange={() => handlePlanSelect(plan.id)}
                      />
                      <div className="glass p-3 rounded-lg border-2 border-transparent peer-checked:border-accent peer-checked:bg-accent-subtle transition-all">
                        <div className="font-bold text-sm">{plan.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">{plan.visits_included} {plan.visits_included === 1 ? 'visita' : 'visitas'}</div>
                        <div className="font-semibold text-accent mt-2">C$ {plan.price}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedPlanId && (
                <div className="mt-2 p-4 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
                  <div className="input-group">
                    <label className="input-label text-xs" htmlFor="starts_at">Fecha de Inicio</label>
                    <input 
                      id="starts_at"
                      name="starts_at"
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                      <label className="input-label text-xs" htmlFor="custom_visits">Visitas a Asignar</label>
                      <input 
                        id="custom_visits"
                        name="custom_visits"
                        type="number" 
                        min="1"
                        value={customVisits}
                        onChange={(e) => setCustomVisits(parseInt(e.target.value) || 0)}
                        className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                        required 
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label text-xs" htmlFor="custom_days">Días de Vigencia</label>
                      <input 
                        id="custom_days"
                        name="custom_days"
                        type="number" 
                        min="1"
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                        className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label text-xs" htmlFor="custom_price">Precio a Cobrar (C$)</label>
                    <input 
                      id="custom_price"
                      name="custom_price"
                      type="number" 
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary flex-1 h-12 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" disabled={pending || !selectedPlanId} className="btn btn-primary flex-1 h-12 rounded-xl">
                  {pending ? 'Procesando...' : 'Asignar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
