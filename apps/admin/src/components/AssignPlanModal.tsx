'use client'

import { useState, useActionState, useEffect } from 'react'
import type { Plan } from '@novafit/types'
import { assignPlanAction } from '@/app/actions/members'

export function AssignPlanModal({ memberId, plans, currentRollover = 0 }: { memberId: string, plans: Plan[], currentRollover?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState(assignPlanAction, null)
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [isDiaPlan, setIsDiaPlan] = useState<boolean>(false)
  const [diaQuantity, setDiaQuantity] = useState<number>(1)
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [customVisits, setCustomVisits] = useState<number>(0)
  const [customDays, setCustomDays] = useState<number>(0)
  
  const [startsAt, setStartsAt] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )x-simulated-date=([^;]*)/)
      if (match && match[1]) {
        const val = decodeURIComponent(match[1])
        if (val.length === 10 && val.includes('-')) return val
      }
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    return new Date().toISOString().split('T')[0]
  })

  // Calculate preview
  let projectedBalance = 0;
  let projectedExpirationStr = '';
  
  if (selectedPlanId) {
    const plan = plans.find(p => p.id === selectedPlanId);
    if (plan) {
      projectedBalance = currentRollover + customVisits;
      if (plan.max_balance && projectedBalance > plan.max_balance) {
        projectedBalance = plan.max_balance;
      }
      
      const [y, m, d] = startsAt.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const expDate = new Date(y, m - 1, d);
        expDate.setDate(expDate.getDate() + customDays);
        projectedExpirationStr = expDate.toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
  }

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
      const isDia = plan.key === 'day'
      setIsDiaPlan(isDia)
      if (isDia) {
        setDiaQuantity(1)
        setCustomPrice(plan.price)
        setCustomVisits(1)
        setCustomDays(2)
      } else {
        setCustomPrice(plan.price)
        setCustomVisits(plan.visits_included)
        setCustomDays(plan.expiration_days)
      }
    }
  }

  const handleDiaQuantityChange = (val: number) => {
    const qty = val > 0 ? val : 1;
    setDiaQuantity(qty);
    const plan = plans.find(p => p.id === selectedPlanId);
    if (plan) {
       setCustomVisits(qty);
       setCustomDays(qty * 2);
       setCustomPrice(plan.price * qty);
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
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                      required 
                    />
                  </div>

                  {isDiaPlan ? (
                    <div className="input-group">
                      <label className="input-label text-xs" htmlFor="dia_quantity">Cantidad de Días (Día Plan)</label>
                      <input 
                        id="dia_quantity"
                        type="number" 
                        min="1"
                        value={diaQuantity}
                        onChange={(e) => handleDiaQuantityChange(parseInt(e.target.value) || 1)}
                        className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                        required 
                      />
                      <div className="mt-2 p-3 bg-black/30 rounded-lg text-xs flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Visitas:</span>
                          <span className="font-bold text-white">{customVisits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vigencia:</span>
                          <span className="font-bold text-white">{customDays} días calendario</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Precio:</span>
                          <span className="font-bold text-accent">C$ {customPrice}</span>
                        </div>
                      </div>
                      <input type="hidden" name="custom_visits" value={customVisits} />
                      <input type="hidden" name="custom_days" value={customDays} />
                      <input type="hidden" name="custom_price" value={customPrice} />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col gap-2 mt-2">
                    <p className="text-xs text-accent font-bold uppercase tracking-wider mb-1">Previsualización</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Visitas Trasladadas (Rollover):</span>
                      <span className="font-medium">{currentRollover}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Visitas Nuevas:</span>
                      <span className="font-medium">{customVisits}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-accent/10 pt-2 mt-1">
                      <span className="text-accent/80 font-medium">Balance Total (con max.):</span>
                      <span className="font-bold text-accent">{projectedBalance}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-accent/80 font-medium">Nueva Fecha Expiración:</span>
                      <span className="font-bold text-accent">{projectedExpirationStr || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 bg-black/20 p-3 rounded-xl border border-white/5">
                    <input 
                      type="checkbox" 
                      id="register_visit" 
                      name="register_visit" 
                      className="w-5 h-5 rounded border-white/20 bg-black/40 accent-accent"
                    />
                    <label htmlFor="register_visit" className="text-sm font-medium cursor-pointer flex-1">
                      Registrar visita automáticamente
                      <span className="block text-xs text-muted-foreground font-normal">
                        Descuenta una visita hoy (ej. si el cliente ya está en el gimnasio).
                      </span>
                    </label>
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
