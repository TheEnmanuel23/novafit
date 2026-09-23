'use client'

import { useTransition } from 'react'
import { deactivateMemberAction } from '@/app/actions/members'

export function DeactivateMemberButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDeactivate = () => {
    if (window.confirm('¿Estás seguro de que deseas desactivar a este miembro? Ya no aparecerá en los listados ni podrá realizar acciones.')) {
      startTransition(async () => {
        try {
          await deactivateMemberAction(memberId)
        } catch (error: any) {
          alert(error.message || 'Error al desactivar el miembro.')
        }
      })
    }
  }

  return (
    <button 
      onClick={handleDeactivate}
      disabled={isPending}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50"
      title="Desactivar Miembro"
    >
      {isPending ? (
        <div className="w-5 h-5 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      )}
    </button>
  )
}
