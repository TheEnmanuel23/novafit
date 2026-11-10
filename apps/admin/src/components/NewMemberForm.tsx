'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useDebouncedCallback } from 'use-debounce'
import type { Plan } from '@novafit/types'
import { registerMember, checkDuplicateMembersAction } from '@/app/actions/members'
import { PlanAssignmentFields } from './PlanAssignmentFields'

type NewMemberFormProps = {
  plans: Plan[]
}

type DuplicateMatch = {
  id: string
  member_id: string
  name: string
  username: string
  phone: string | null
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  low_balance: 'Por expirar',
  scheduled: 'Programado',
  expired: 'Expirado',
  no_plan: 'Sin Plan',
}

export function NewMemberForm({ plans }: NewMemberFormProps) {
  const [state, formAction, pending] = useActionState(registerMember, null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [nameMatches, setNameMatches] = useState<DuplicateMatch[]>([])
  const [phoneMatches, setPhoneMatches] = useState<DuplicateMatch[]>([])

  const checkName = useDebouncedCallback(async (value: string) => {
    const trimmed = value.trim()
    setNameMatches(trimmed.length >= 3 ? await checkDuplicateMembersAction('name', trimmed) : [])
  }, 350)

  const checkPhone = useDebouncedCallback(async (value: string) => {
    const digits = value.replace(/\D/g, '')
    setPhoneMatches(digits.length >= 4 ? await checkDuplicateMembersAction('phone', value) : [])
  }, 350)

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
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            onChange={(e) => checkName(e.target.value)}
            aria-describedby={nameMatches.length > 0 ? 'name-duplicate-warning' : undefined}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl"
            required
            placeholder="Ej. Juan Pérez"
          />
          <div id="name-duplicate-warning" aria-live="polite">
            {nameMatches.length > 0 && (
              <DuplicateWarningBox
                title="Ya existe un miembro con un nombre similar:"
                matches={nameMatches}
              />
            )}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="phone">Teléfono (Opcional)</label>
          <input 
            id="phone" 
            name="phone" 
            type="tel" 
            inputMode="numeric"
            autoComplete="off"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/[^0-9-]/g, '')
              checkPhone(e.currentTarget.value)
            }}
            aria-describedby={phoneMatches.length > 0 ? 'phone-duplicate-warning' : undefined}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            placeholder="Ej. 8888-8888" 
          />
          <div id="phone-duplicate-warning" aria-live="polite">
            {phoneMatches.length > 0 && (
              <DuplicateWarningBox
                title="Ya existe un miembro con un teléfono similar:"
                matches={phoneMatches}
              />
            )}
          </div>
        </div>
      </section>

      <section className="glass p-5 flex flex-col gap-4">
        <h2 className="section-title !mb-0">Plan Inicial</h2>
        <p className="text-xs text-muted-foreground mb-2">Selecciona el paquete base. Podrás personalizar los detalles antes de guardar.</p>

        <PlanAssignmentFields
          plans={plans}
          showCustomizeHeader
          selectedPlanId={selectedPlanId}
          onSelectPlan={setSelectedPlanId}
          emptyMessage="No hay planes activos disponibles. Por favor, crea uno primero en Configuración > Planes."
        />
      </section>

      <button type="submit" disabled={pending} className="btn h-14 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all rounded-xl mt-2">
        {pending ? 'Registrando...' : 'Registrar y Generar QR'}
      </button>
    </form>
  )
}

function DuplicateWarningBox({
  title,
  matches,
}: {
  title: string
  matches: DuplicateMatch[]
}) {
  return (
    <div className="mt-1.5 rounded-xl bg-warning/10 border border-warning/30 p-3 text-xs flex flex-col gap-2 animate-in fade-in">
      <div className="flex items-center gap-2 text-warning font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {matches.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5"
          >
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">{m.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {m.username}
                {m.phone ? ` • ${m.phone}` : ''}
                {m.status ? ` • ${STATUS_LABELS[m.status] || m.status}` : ''}
              </div>
            </div>
            <Link
              href={`/members/${m.member_id}`}
              className="px-2.5 py-1 rounded-lg bg-warning/20 hover:bg-warning/30 text-warning font-semibold text-[11px] shrink-0 transition-colors"
            >
              Ver perfil →
            </Link>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Si es la misma persona, abre su perfil para asignarle un plan. Si es otra persona, puedes continuar con el registro.
      </p>
    </div>
  )
}
