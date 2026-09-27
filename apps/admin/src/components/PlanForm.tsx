'use client'

import { useActionState } from 'react'
import { createPlan, updatePlan } from '@/app/actions/plans'
import Link from 'next/link'
import type { Plan } from '@novafit/types'

type PlanFormProps = {
  initialData?: Plan
}

export function PlanForm({ initialData }: PlanFormProps) {
  const isEditing = !!initialData
  // Need to bind the id to the action if we are editing
  const actionWithId = isEditing 
    ? updatePlan.bind(null, initialData.id) 
    : createPlan
    
  const [state, formAction, pending] = useActionState(actionWithId, null)

  return (
    <form action={formAction} className="flex flex-col gap-5 glass p-6">
      {state?.error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
          {state.error}
        </div>
      )}

      <div className="input-group">
        <label className="input-label" htmlFor="description">Descripción del Plan</label>
        <input 
          id="description"
          name="description"
          type="text" 
          defaultValue={initialData?.description || ''}
          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
          required 
          placeholder="Ej. Mensual, Quincenal..."
        />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="key">Clave Única (Opcional)</label>
        <input 
          id="key"
          name="key"
          type="text" 
          defaultValue={initialData?.key || ''}
          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
          placeholder="Ej. day, month, biweek..."
        />
        <p className="text-xs text-muted-foreground mt-1">Identificador interno para lógicas especiales (ej. "day" para pase diario).</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label className="input-label" htmlFor="visits_included">Visitas Incluidas</label>
          <input 
            id="visits_included"
            name="visits_included"
            type="number" 
            min="1"
            defaultValue={initialData?.visits_included || 1}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            required 
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="price">Precio (C$)</label>
          <input 
            id="price"
            name="price"
            type="number" 
            min="0"
            defaultValue={initialData?.price || 0}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            required 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label className="input-label" htmlFor="max_balance">Balance Máximo</label>
          <input 
            id="max_balance"
            name="max_balance"
            type="number" 
            min="1"
            defaultValue={initialData?.max_balance || 1}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            required 
            title="Máximo de visitas acumuladas permitidas para este plan"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="expiration_days">Días de Expiración</label>
          <input 
            id="expiration_days"
            name="expiration_days"
            type="number" 
            min="1"
            defaultValue={initialData?.expiration_days || 30}
            className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
            required 
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <input 
          type="checkbox" 
          id="active" 
          name="active" 
          defaultChecked={initialData ? initialData.active : true}
          className="w-5 h-5 rounded border-white/20 bg-black/40 accent-accent"
        />
        <label htmlFor="active" className="text-sm font-medium">Plan Activo</label>
      </div>

      <div className="flex gap-3 mt-4">
        <button 
          type="submit" 
          disabled={pending}
          className="btn flex-1 h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all"
        >
          {pending ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Plan')}
        </button>
        <Link 
          href="/plans"
          className="btn flex-1 h-12 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white flex items-center justify-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
