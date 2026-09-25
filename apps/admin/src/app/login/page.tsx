'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '../actions/auth'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await signIn(formData)
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
            {/* Dumbbell Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="m14.4 14.4 5.2-5.2"/><path d="M22.5 7.5 16.5 1.5"/><path d="M18.4 5.6l-3.2 3.2"/><path d="m4.4 14.4-3.2 3.2"/><path d="m22.5 22.5-6-6"/><path d="m7.5 22.5-6-6"/><path d="m5.6 18.4 3.2-3.2"/><path d="M9.6 9.6 4.4 4.4"/></svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">NovaFit</h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-bold text-accent">
            Portal de Administración
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
              <label className="input-label text-[11px]" htmlFor="identifier">Usuario o Correo</label>
              <div className="relative flex items-center" suppressHydrationWarning>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input 
                  id="identifier"
                  name="identifier"
                  type="text" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="carlos o admin@novafit.com"
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <div className="flex justify-between items-center mb-1">
                <label className="input-label !mb-0 text-[11px]" htmlFor="password">Contraseña</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative flex items-center" suppressHydrationWarning>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input 
                  id="password"
                  name="password"
                  type="password" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-xl h-14" 
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={pending}
              className="btn h-14 rounded-xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all"
            >
              {pending ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          ¿Primera vez? <a href="/signup" className="text-white hover:text-accent transition-colors font-bold underline underline-offset-4">Registrarse</a>
        </p>
      </div>
    </div>
  )
}
