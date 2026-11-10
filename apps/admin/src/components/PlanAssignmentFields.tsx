'use client'

import { useState } from 'react'
import { parseISO, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Plan } from '@novafit/types'
import { getTodayYYYYMMDD, toPeriodYYYYMMDD } from '@novafit/supabase/src/utils/date'

type PlanAssignmentFieldsProps = {
  plans: Plan[]
  currentRollover?: number
  currentPlanExpiration?: string
  showRollover?: boolean
  showCustomizeHeader?: boolean
  selectedPlanId: string
  onSelectPlan: (planId: string) => void
  emptyMessage?: string
}

export function PlanAssignmentFields({
  plans,
  currentRollover = 0,
  currentPlanExpiration,
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
  const todayStr = getTodayYYYYMMDD()
  const [startsAt, setStartsAt] = useState<string>(() => todayStr)

  const isFutureStart = Boolean(startsAt && startsAt > todayStr)

  let nextAfterCurrentStr = ''
  let nextAfterCurrentLabel = ''
  if (currentPlanExpiration) {
    try {
      const expYmd = toPeriodYYYYMMDD(currentPlanExpiration)
      if (expYmd) {
        const nextDate = addDays(parseISO(expYmd), 1)
        nextAfterCurrentStr = format(nextDate, 'yyyy-MM-dd')
        nextAfterCurrentLabel = format(nextDate, 'd/M/yyyy')
      }
    } catch {
      // ignore invalid date
    }
  }

  let in30DaysStr = ''
  let in30DaysLabel = ''
  try {
    const plus30 = addDays(parseISO(todayStr), 30)
    in30DaysStr = format(plus30, 'yyyy-MM-dd')
    in30DaysLabel = format(plus30, 'd/M/yyyy')
  } catch {
    // ignore
  }

  let projectedBalance = 0
  let projectedStartStr = ''
  let projectedExpirationStr = ''
  const selectedPlan = selectedPlanId ? plans.find((p) => p.id === selectedPlanId) : undefined

  if (selectedPlan) {
    if (isFutureStart) {
      projectedBalance = customVisits - customVisitsUsed
    } else {
      projectedBalance = currentRollover + customVisits - customVisitsUsed
      if (!isDiaPlan && selectedPlan.max_balance && projectedBalance > selectedPlan.max_balance) {
        projectedBalance = selectedPlan.max_balance
      }
    }

    try {
      if (startsAt) {
        const parsedStart = parseISO(startsAt)
        projectedStartStr = format(parsedStart, "d 'de' MMMM 'de' yyyy", { locale: es })
        const expDate = addDays(parsedStart, customDays)
        projectedExpirationStr = format(expDate, "d 'de' MMMM 'de' yyyy", { locale: es })
      }
    } catch {
      // ignore invalid dates
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
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => setStartsAt(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  startsAt === todayStr
                    ? 'bg-accent/20 text-accent border-accent/40'
                    : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                Hoy (Activar ahora)
              </button>
              {nextAfterCurrentStr && nextAfterCurrentStr > todayStr && (
                <button
                  type="button"
                  onClick={() => setStartsAt(nextAfterCurrentStr)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    startsAt === nextAfterCurrentStr
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Al vencer plan actual ({nextAfterCurrentLabel})
                </button>
              )}
              {in30DaysStr && in30DaysStr !== nextAfterCurrentStr && (
                <button
                  type="button"
                  onClick={() => setStartsAt(in30DaysStr)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    startsAt === in30DaysStr
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  En 30 días ({in30DaysLabel})
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isFutureStart
                ? 'Al elegir una fecha futura, el plan quedará programado y no afectará el plan activo actual.'
                : 'Los días de vigencia contarán a partir de esta fecha.'}
            </p>
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
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-accent font-bold uppercase tracking-wider">Previsualización</p>
              {isFutureStart && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-warning/20 text-warning border border-warning/30">
                  Programado
                </span>
              )}
            </div>
            {!isFutureStart && showRollover && (
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
              <span className="text-accent/80 font-medium">
                {isFutureStart ? 'Visitas del Plan Programado:' : 'Balance Total (con max.):'}
              </span>
              <span className="font-bold text-accent">{projectedBalance}</span>
            </div>
            {isFutureStart && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-accent/80 font-medium">Inicia el:</span>
                <span className="font-bold text-warning">{projectedStartStr || 'N/A'}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-accent/80 font-medium">Nueva Fecha Expiración:</span>
              <span className="font-bold text-accent">{projectedExpirationStr || 'N/A'}</span>
            </div>
            {isFutureStart && (
              <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-accent/10 leading-relaxed">
                {showRollover && currentRollover > 0
                  ? `El plan actual seguirá activo hoy. Cuando inicie este plan (o al activarlo), las visitas sobrantes se trasladarán automáticamente${selectedPlan?.max_balance && !isDiaPlan ? ` (hasta el límite de ${selectedPlan.max_balance} días)` : ''}.`
                  : 'Este plan quedará en espera y se activará automáticamente en su fecha de inicio.'}
              </p>
            )}
          </div>

          {!isFutureStart && (
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
          )}
        </div>
      )}
    </>
  )
}

