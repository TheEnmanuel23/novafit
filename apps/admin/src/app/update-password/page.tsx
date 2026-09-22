'use client'

import { useActionState } from 'react'
import { updateUserPassword } from '../actions/auth'

export default function UpdatePasswordPage() {
  const [state, formAction, pending] = useActionState(updateUserPassword, null)

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Nueva Contraseña</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Ingresa tu nueva contraseña para acceder al sistema.
          </p>
        </div>

        <div className="glass-strong p-8 rounded-3xl relative overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
          
          <form action={formAction} className="flex flex-col gap-5 relative z-10">
            {state?.error && (
              <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                {state.error}
              </div>
            )}

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor="password">Nueva Contraseña</label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input 
                  id="password"
                  name="password"
                  type="password" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="••••••••"
                  required 
                  minLength={6}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor="confirmPassword">Confirmar Contraseña</label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input 
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="••••••••"
                  required 
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button 
                type="submit" 
                disabled={pending}
                className="btn h-14 rounded-xl text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all w-full"
              >
                {pending ? 'Actualizando...' : 'Guardar Contraseña'}
              </button>
              
              <a href="/dashboard" className="btn h-14 rounded-xl text-base font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white w-full text-center flex items-center justify-center">
                Cancelar
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
