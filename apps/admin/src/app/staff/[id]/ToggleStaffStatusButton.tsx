'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleStaffActiveStatus } from '@/app/actions/staff'

export default function ToggleStaffStatusButton({
  staffId,
  staffName,
  isActive,
}: {
  staffId: string
  staffName: string
  isActive: boolean
}) {
  const router = useRouter()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await toggleStaffActiveStatus(staffId, !isActive)
      if (res.error) {
        setError(res.error)
      } else {
        setIsConfirmOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setIsConfirmOpen(true)
        }}
        className={
          isActive
            ? 'btn !min-h-10 px-4 text-xs rounded-xl bg-error/15 text-error border border-error/30 hover:bg-error/25'
            : 'btn btn-success !min-h-10 px-4 text-xs rounded-xl'
        }
      >
        {isActive ? 'Desactivar' : 'Reactivar'}
      </button>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">
              {isActive ? '¿Desactivar cuenta de staff?' : '¿Reactivar cuenta de staff?'}
            </h3>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {isActive ? (
                <>
                  Se cerrará inmediatamente la sesión de{' '}
                  <strong className="text-foreground">{staffName}</strong> en todos sus
                  dispositivos y no podrá volver a iniciar sesión hasta ser reactivado.
                </>
              ) : (
                <>
                  <strong className="text-foreground">{staffName}</strong> podrá volver a
                  iniciar sesión en el portal de administración con su cuenta.
                </>
              )}
            </p>

            {error && (
              <div className="bg-error/15 border border-error/30 text-error px-3.5 py-2.5 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsConfirmOpen(false)}
                className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className={`btn !min-h-10 px-5 text-xs rounded-xl ${
                  isActive ? 'btn-error' : 'btn-success'
                }`}
              >
                {isPending
                  ? isActive
                    ? 'Desactivando...'
                    : 'Reactivando...'
                  : isActive
                  ? 'Sí, desactivar'
                  : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

