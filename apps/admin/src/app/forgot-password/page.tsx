'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { sendResetPasswordEmail } from '../actions/auth'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(sendResetPasswordEmail, null)

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Recuperar Contraseña</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Ingresa el correo electrónico asociado a tu cuenta.
          </p>
        </div>

        <div className="glass-strong p-8 rounded-3xl relative overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
          
          {state?.success ? (
            <div className="flex flex-col items-center gap-4 text-center relative z-10">
              <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 className="text-xl font-bold">Correo Enviado</h2>
              <p className="text-sm text-muted-foreground">Revisa tu bandeja de entrada para obtener el enlace de restablecimiento.</p>
              <Link href="/login" className="btn bg-surface hover:bg-surface-hover border border-border w-full mt-4">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-5 relative z-10">
              {state?.error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  {state.error}
                </div>
              )}

              <div className="input-group">
                <label className="input-label text-[11px]" htmlFor="email">Correo Electrónico</label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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

              <button 
                type="submit" 
                disabled={pending}
                className="btn h-14 rounded-xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all"
              >
                {pending ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <Link href="/login" className="text-center text-sm font-medium text-muted-foreground hover:text-white transition-colors mt-2">
                Volver al login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
