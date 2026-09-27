'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const name = searchParams.get('name')
  const phone = searchParams.get('phone')

  return (
    <div className="flex flex-col gap-4 p-6 max-w-md mx-auto mt-10 border rounded-xl shadow-lg bg-white text-black">
      <h1 className="text-2xl font-bold text-center mb-4">Registro en NovaFit</h1>
      
      <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono mb-4 break-all">
        {JSON.stringify({ id, name, phone }, null, 2)}
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">ID de Usuario</label>
          <input type="text" disabled value={id || ''} className="p-2 border rounded bg-gray-50" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Nombre</label>
          <input type="text" disabled value={name || ''} className="p-2 border rounded bg-gray-50" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Teléfono</label>
          <input type="text" disabled value={phone || ''} className="p-2 border rounded bg-gray-50" />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <label className="text-sm font-semibold">Contraseña</label>
          <input type="password" required className="p-2 border rounded focus:ring-2 outline-none focus:ring-blue-500" placeholder="••••••••" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Confirmar Contraseña</label>
          <input type="password" required className="p-2 border rounded focus:ring-2 outline-none focus:ring-blue-500" placeholder="••••••••" />
        </div>

        <button type="button" className="mt-4 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
          Registrarme
        </button>
      </form>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
