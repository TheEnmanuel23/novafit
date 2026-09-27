'use client'

import { useActionState, useState } from 'react'
import type { Plan } from '@novafit/types'
import { registerMember } from '@/app/actions/members'

type NewMemberFormProps = {
  plans: Plan[]
}

export function NewMemberForm({ plans }: NewMemberFormProps) {
  const [state, formAction, pending] = useActionState(registerMember, null)
  
  // State for the selected plan and customized fields
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [isDiaPlan, setIsDiaPlan] = useState<boolean>(false)
  const [diaQuantity, setDiaQuantity] = useState<number>(1)
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [customVisits, setCustomVisits] = useState<number>(0)
  const [customDays, setCustomDays] = useState<number>(0)
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().split('T')[0])

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
    <form className="flex flex-col gap-6" action={formAction}>
      {state?.error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
          {state.error}
        </div>
      )}

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Datos Personales</h2>
        
        <div className="input-group">
          <label className="input-label" htmlFor="name">Nombre Completo *</label>
          <input id="name" name="name" type="text" className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" required placeholder="Ej. Juan Pérez" />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="phone">Teléfono (Opcional)</label>
          <input 
            id="phone" 
            name="phone" 
            type="tel" 
            inputMode="numeric"
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            placeholder="Ej. 8888-8888" 
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/[^0-9-]/g, '')
            }}
          />
        </div>
      </section>

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Plan Inicial</h2>
        <p className="text-xs text-muted-foreground mb-2">Selecciona el paquete base. Podrás personalizar los detalles antes de guardar.</p>
        
        {plans.length === 0 ? (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
            No hay planes activos disponibles. Por favor, crea uno primero en Configuración &gt; Planes.
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
          <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-accent">Personalizar Asignación</h3>
            
            <div className="input-group">
              <label className="input-label text-xs" htmlFor="starts_at">Fecha de Inicio del Plan</label>
              <input 
                id="starts_at"
                name="starts_at"
                type="date" 
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm" 
                required 
              />
              <p className="text-[10px] text-muted-foreground mt-1">Los días de vigencia contarán a partir de esta fecha.</p>
            </div>

            {isDiaPlan ? (
              <div className="input-group mt-2">
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
                <div className="grid grid-cols-2 gap-3 mt-2">
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
                  <label className="input-label text-xs" htmlFor="custom_price">Precio Cobrado (C$)</label>
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
      </section>

      <button type="submit" disabled={pending} className="btn h-14 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all rounded-xl mt-2">
        {pending ? 'Registrando...' : 'Registrar y Generar QR'}
      </button>
    </form>
  )
}
