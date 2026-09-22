'use client'

import { useState } from 'react'
import { resetStaffPassword } from '@/app/actions/staff'

export default function ResetPasswordButton({ staffId }: { staffId: string }) {
  const [isPending, setIsPending] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que deseas restablecer la contraseña de este empleado? Esta acción no se puede deshacer y deberás enviarle la nueva contraseña manualmente.')) {
      return
    }

    setIsPending(true)
    setError(null)
    setNewPassword(null)

    try {
      const result = await resetStaffPassword(staffId)
      if (result.error) {
        setError(result.error)
      } else if (result.success && result.newPassword) {
        setNewPassword(result.newPassword)
      }
    } catch (e) {
      setError('Ocurrió un error inesperado al restablecer la contraseña.')
    } finally {
      setIsPending(false)
    }
  }

  if (newPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
        <div className="bg-surface border border-border p-6 rounded-xl max-w-md w-full shadow-2xl flex flex-col gap-4">
          <h3 className="text-xl font-bold text-success flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Contraseña Restablecida
          </h3>
          <p className="text-sm text-muted-foreground">Copia esta contraseña temporal y entrégasela al empleado de manera segura.</p>
          <div className="bg-black/50 p-4 rounded-lg flex justify-between items-center border border-white/10">
            <code className="text-lg font-mono text-white select-all">{newPassword}</code>
          </div>
          <button onClick={() => setNewPassword(null)} className="btn btn-primary mt-2">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button 
        onClick={handleReset} 
        disabled={isPending}
        className="btn bg-surface hover:bg-surface-hover border border-border btn-sm text-destructive hover:text-destructive"
        title="Generar una nueva contraseña temporal"
      >
        {isPending ? 'Procesando...' : 'Restablecer Contraseña'}
      </button>
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white px-4 py-2 rounded shadow-lg z-50 animate-in slide-in-from-bottom-2">
          {error}
        </div>
      )}
    </>
  )
}
