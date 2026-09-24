'use client'

import { useState } from 'react'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  
  return (
    <div className="app-container justify-center items-center p-4">
      <div className="glass w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-subtle text-accent flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Configuración Inicial</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Bienvenido a NovaFit v2. Para comenzar, necesitamos crear la cuenta de <strong>Administrador Global</strong>.
        </p>

        <form onSubmit={(e) => {
          e.preventDefault()
          setLoading(true)
          // Handle setup logic here
        }} className="flex flex-col gap-4 text-left">
          
          <div className="input-group">
            <label className="input-label" htmlFor="name">Tu Nombre</label>
            <input id="name" name="name" type="text" className="input" required placeholder="Ej. Carlos Administrador" />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">Correo (Gmail recomendado)</label>
            <input id="email" name="email" type="email" className="input" required placeholder="admin@novafit.com" />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" className="input" required placeholder="••••••••" minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Configurando...' : 'Crear Administrador'}
          </button>
        </form>
      </div>
    </div>
  )
}
