'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const id = searchParams.get('id') || ''
  const initialName = searchParams.get('name') || ''
  const initialPhone = searchParams.get('phone') || ''

  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const paramName = searchParams.get('name')
    const paramPhone = searchParams.get('phone')
    if (paramName !== null) setName(paramName)
    if (paramPhone !== null) setPhone(paramPhone)
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSuccess(true)
  }

  const loginHref = id ? `/?id=${encodeURIComponent(id)}` : '/'

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-between items-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[5%] right-[-10%] w-[60%] h-[40%] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-20%] w-[70%] h-[50%] bg-success/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="w-full max-w-sm mt-6 mb-6 animate-in slide-in-from-top-8 fade-in duration-700 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/20 mb-3 overflow-hidden flex items-center justify-center">
          <Image
            src="/novafit-logo.jpg"
            alt="NovaFit Logo"
            width={80}
            height={80}
            className="w-full h-full object-contain rounded-xl"
            priority
          />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">NovaFit</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Tu salud, a otro nivel.</p>
      </div>

      {/* Registration Card */}
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center animate-in zoom-in-95 fade-in duration-700 delay-150">
        <div className="glass-strong p-7 rounded-[32px] shadow-2xl relative overflow-hidden border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10 mb-6">
            <h2 className="text-2xl font-bold text-white">Activa tu cuenta</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Confirma o actualiza tus datos y crea tu contraseña para ingresar a la app.
            </p>
          </div>

          {success ? (
            <div className="relative z-10 flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">¡Cuenta activada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hola <span className="text-white font-semibold">{name.trim()}</span>, tu usuario{' '}
                  <span className="text-accent font-mono font-semibold">{id || 'NovaFit'}</span> está listo para usarse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(loginHref)}
                className="btn w-full h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                Ir a Iniciar Sesión
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          ) : (
            <form method="POST" onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
              {error && (
                <div
                  role="alert"
                  className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
                >
                  {error}
                </div>
              )}

              {/* Read-only Member ID */}
              <div className="input-group">
                <label
                  className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                  htmlFor="register-username"
                >
                  ID de Usuario
                </label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-accent pointer-events-none"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    readOnly
                    value={id}
                    autoComplete="username"
                    className="input pl-12 bg-white/5 border-white/10 text-accent font-mono font-bold rounded-2xl h-12 cursor-default focus:shadow-none focus:border-white/10"
                    placeholder="Sin ID asignado"
                  />
                </div>
              </div>

              {/* Editable Name */}
              <div className="input-group">
                <label
                  className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                  htmlFor="register-name"
                >
                  Nombre
                </label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError(null)
                    }}
                    autoComplete="name"
                    enterKeyHint="next"
                    className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>
              </div>

              {/* Editable Phone */}
              <div className="input-group">
                <label
                  className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                  htmlFor="register-phone"
                >
                  Teléfono
                </label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (error) setError(null)
                    }}
                    autoComplete="tel"
                    enterKeyHint="next"
                    className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                    placeholder="Ej: 8888-8888"
                  />
                </div>
              </div>

              <div className="divider !my-1.5" />

              {/* Password Field */}
              <div className="input-group">
                <label
                  className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                  htmlFor="new-password"
                >
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError(null)
                    }}
                    autoComplete="new-password"
                    minLength={6}
                    enterKeyHint="next"
                    className="input pl-12 pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="input-group">
                <label
                  className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                  htmlFor="confirm-password"
                >
                  Confirmar Contraseña
                </label>
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (error) setError(null)
                    }}
                    autoComplete="new-password"
                    minLength={6}
                    enterKeyHint="done"
                    className="input pl-12 pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                    placeholder="Repite tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-pressed={showConfirmPassword}
                    aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
              >
                Registrarme
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="w-full max-w-sm pt-6 pb-4 text-center animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{' '}
          <Link href={loginHref} className="text-white hover:text-accent font-semibold underline underline-offset-4 transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-radial flex items-center justify-center"><div className="spinner" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
