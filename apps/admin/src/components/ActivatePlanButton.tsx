'use client'

import { useState, useTransition } from 'react'
import { activateScheduledPlanAction } from '@/app/actions/members'

export function ActivatePlanButton({
  planId,
  memberId,
  hasActivePlan = false,
}: {
  planId: string
  memberId: string
  hasActivePlan?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleActivate = () => {
    const confirmMsg = hasActivePlan
      ? '¿Activar este plan ahora? Las visitas restantes del plan activo actual se trasladarán a este plan (según el límite máximo) y la vigencia iniciará hoy.'
      : '¿Activar este plan hoy? Su fecha de inicio pasará a ser hoy y se recalculará su fecha de expiración.'
    if (!window.confirm(confirmMsg)) return

    setError(null)
    startTransition(async () => {
      const res = await activateScheduledPlanAction(planId, memberId)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleActivate}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        title="Activar este plan hoy"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {isPending ? 'Activando...' : 'Activar Ahora'}
      </button>
      {error && <span className="text-[10px] text-error">{error}</span>}
    </div>
  )
}

