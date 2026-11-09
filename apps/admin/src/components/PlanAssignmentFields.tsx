'use client'

import { useState } from 'react'
import { parseISO, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Plan } from '@novafit/types'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'

type PlanAssignmentFieldsProps = {
  plans: Plan[]
  currentRollover?: number
  showRollover?: boolean
  showCustomizeHeader?: boolean
  selectedPlanId: string
  onSelectPlan: (planId: string) => void
  emptyMessage?: string
}

export function PlanAssignmentFields({
  plans,
  currentRollover = 0,
  showRollover = false,
  showCustomizeHeader = false,
  selectedPlanId,
  onSelectPlan,
  emptyMessage = 'No hay planes activos disponibles.'
}: PlanAssignmentFieldsProps) {
  const [isDiaPlan, setIsDiaPlan] = useState<boolean>(false)
  const [diaQuantity, setDiaQuantity] = useState<number>(1)
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [customVisits, setCustomVisits] = useState<number>(0)
  const [customVisitsUsed, setCustomVisitsUsed] = useState<number>(0)
  const [customDays, setCustomDays] = useState<number>(0)
  const [startsAt, setStartsAt] = useState<string>(() => getTodayYYYYMMDD())

  let projectedBalance = 0
  let projectedExpirationStr = ''

  if (selectedPlanId) {
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (plan) {
      projectedBalance = currentRollover + customVisits - customVisitsUsed
      if (!isDiaPlan && plan.max_balance && projectedBalance > plan.max_balance) {
        projectedBalance = plan.max_balance
      }

      try {
        if (startsAt) {
          const expDate = addDays(parseISO(startsAt), customDays)
          projectedExpirationStr = format(expDate, "d 'de' MMMM 'de' yyyy", { locale: es })
        }
      } catch {
        // ignore invalid dates
      }
    }
  }

  const handlePlanSelect = (planId: string) => {
    onSelectPlan(planId)
    const plan = plans.find((p) => p.id === planId)
    if (plan) {
      const isDia = plan.key === 'day'
      setIsDiaPlan(isDia)
      if (isDia) {
        setDiaQuantity(1)
        setCustomPrice(plan.price)
        setCustomVisits(1)
        setCustomVisitsUsed(0)
        setCustomDays(2)
      } else {
        setCustomPrice(plan.price)
        setCustomVisits(plan.visits_included)
        setCustomVisitsUsed(0)
        setCustomDays(plan.expiration_days)
      }
    }
  }

  const handleDiaQuantityChange = (val: number) => {
    const qty = val > 0 ? val : 1
    setDiaQuantity(qty)
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (plan) {
      setCustomVisits(qty)
      setCustomVisitsUsed(0)
      setCustomDays(qty * 2)
      setCustomPrice(plan.price * qty)
    }
  }

  return (
    <>
      {plans.length === 0 ? (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
          {emptyMessage}
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
                <div className="text-xs text-muted-foreground mt-1">
                  {plan.visits_included} {plan.visits_included === 1 ? 'visita' : 'visitas'}
                </div>
                <div className="font-semibold text-accent mt-2">C$ {plan.price}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {selectedPlanId && (
        <div className="mt-2 p-4 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
          {showCustomizeHeader && (
            <h3 className="text-sm font-bold text-accent">Personalizar Asignación</h3>
          )}

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
            {showCustomizeHeader && (
              <p className="text-[10px] text-muted-foreground mt-1">Los días de vigencia contarán a partir de esta fecha.</p>
            )}
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
                  <span className="text-muted-foreground">Días:</span>
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
              <input type="hidden" name="custom_visits_used" value={customVisitsUsed} />
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

              <div className="grid grid-cols-2 gap-3 mt-2">
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

                <div className="input-group">
                  <label className="input-label text-xs" htmlFor="custom_visits_used">Visitas ya usadas</label>
                  <input
                    id="custom_visits_used"
                    name="custom_visits_used"
                    type="number"
                    min="0"
                    max={customVisits}
                    value={customVisitsUsed}
                    onChange={(e) => setCustomVisitsUsed(parseInt(e.target.value) || 0)}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col gap-2 mt-2">
            <p className="text-xs text-accent font-bold uppercase tracking-wider mb-1">Previsualización</p>
            {showRollover && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Visitas Trasladadas (Rollover):</span>
                <span className="font-medium">{currentRollover}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Visitas Nuevas:</span>
              <span className="font-medium">{customVisits}</span>
            </div>
            {customVisitsUsed > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Visitas Ya Usadas:</span>
                <span className="font-medium text-error">-{customVisitsUsed}</span>
              </div>
            )}
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
    </>
  )
}

