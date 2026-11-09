'use client'

import { useActionState, useState } from 'react'
import type { Plan } from '@novafit/types'
import { registerMember } from '@/app/actions/members'
import { PlanAssignmentFields } from './PlanAssignmentFields'

type NewMemberFormProps = {
  plans: Plan[]
}

export function NewMemberForm({ plans }: NewMemberFormProps) {
  const [state, formAction, pending] = useActionState(registerMember, null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

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
