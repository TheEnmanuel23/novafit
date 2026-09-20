'use client'

import { useActionState } from 'react'
import { signUpGlobalAdmin } from '../actions/signup'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await signUpGlobalAdmin(formData)
    },
    null
  )

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-4 backdrop-blur-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Configuración Inicial</h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-bold text-accent">
            Crear Global Admin
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
              <label className="input-label text-[11px]" htmlFor="nombre">Nombre Completo</label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input 
                  id="nombre"
                  name="nombre"
                  type="text" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="Tu nombre"
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor="email">Correo Electrónico</label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input 
                  id="email"
                  name="email"
                  type="email" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="admin@novafit.com"
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor="password">Contraseña</label>
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

            <button 
              type="submit" 
              disabled={pending}
              className="btn h-14 rounded-xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all"
            >
              {pending ? 'Configurando...' : 'Crear Administrador'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          ¿Ya existe un Global Admin? <a href="/login" className="text-white hover:text-accent transition-colors font-bold underline underline-offset-4">Iniciar Sesión</a>
        </p>
      </div>
    </div>
  )
}
