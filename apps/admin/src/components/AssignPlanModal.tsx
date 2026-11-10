'use client'

import { useState, useActionState, useEffect } from 'react'
import type { Plan } from '@novafit/types'
import { assignPlanAction } from '@/app/actions/members'
import { PlanAssignmentFields } from './PlanAssignmentFields'

export function AssignPlanModal({
  memberId,
  plans,
  currentRollover = 0,
  currentPlanExpiration,
}: {
  memberId: string
  plans: Plan[]
  currentRollover?: number
  currentPlanExpiration?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState(assignPlanAction, null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false)
      setSelectedPlanId('')
    }
  }, [state])

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

              <PlanAssignmentFields
                plans={plans}
                currentRollover={currentRollover}
                currentPlanExpiration={currentPlanExpiration}
                showRollover
                selectedPlanId={selectedPlanId}
                onSelectPlan={setSelectedPlanId}
              />

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
