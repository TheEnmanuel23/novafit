'use client'

import { useTransition } from 'react'
import { toggleMemberPasswordResetAction } from '@/app/actions/members'

export function AuthorizePasswordResetButton({
  memberId,
  isAllowed,
}: {
  memberId: string
  isAllowed: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      await toggleMemberPasswordResetAction(memberId, !isAllowed)
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={
        isAllowed
          ? 'Cambio de contraseña autorizado (clic para cancelar)'
          : 'Autorizar al miembro a cambiar su contraseña desde su celular sin enlace'
      }
      className={`btn h-10 px-3.5 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all ${
        isAllowed
          ? 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30'
          : 'btn-secondary'
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3L22 7l-3-3" />
      </svg>
      <span className="hidden sm:inline">
        {isPending
          ? 'Actualizando...'
          : isAllowed
            ? 'Reseteo Autorizado'
            : 'Autorizar Clave'}
      </span>
    </button>
  )
}

