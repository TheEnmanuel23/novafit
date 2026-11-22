'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'

function MemberAppContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialUsername = searchParams.get('id') || searchParams.get('username') || ''
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)

  useEffect(() => {
    const paramUser = searchParams.get('id') || searchParams.get('username')
    if (paramUser && !username) {
      setUsername(paramUser)
    }
  }, [searchParams, username])

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.trim().toUpperCase()
    if (!cleanUsername || !password) {
      setError('Por favor ingresa tu usuario y contraseña.')
      return
    }

    // Clear query params like ?username=... from URL on login
    if (searchParams.toString()) {
      router.replace('/')
    }

    setLoggedInUser(cleanUsername)
  }

  const handleLogout = () => {
    setLoggedInUser(null)
    setPassword('')
    setShowPassword(false)
  }

  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-radial relative overflow-hidden">
        <div className="app-container">
          <header className="page-header justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
                <Image
                  src="/novafit-logo.jpg"
                  alt="NovaFit Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-tight">NovaFit</h1>
                <p className="text-xs text-muted-foreground font-mono">{loggedInUser}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold"
            >
              Cerrar sesión
            </button>
          </header>

          <main className="page-content flex flex-col gap-5 mt-4">
            <div className="glass-strong p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center gap-4">
              <span className="badge badge-active">Sesión Iniciada (Placeholder)</span>
              <h2 className="text-2xl font-bold text-white">¡Hola, {loggedInUser}!</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Esta es la vista principal de miembro (en construcción). Aquí se mostrará la información de tu cuenta conectada a NovaFit.
              </p>
            </div>

            <div className="glass p-5 rounded-2xl flex flex-col gap-2">
              <p className="section-title !mb-1">Próximos módulos en esta vista</p>
              <ul className="text-sm text-muted-foreground flex flex-col gap-2.5 mt-1">
                <li className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  <span><strong className="text-white">Código QR de acceso:</strong> Para escanear en recepción</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span><strong className="text-white">Plan activo y balance:</strong> Días disponibles, usados y fecha de vencimiento</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  <span><strong className="text-white">Historial de asistencias:</strong> Registro de tus visitas recientes</span>
                </li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-between items-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[5%] right-[-10%] w-[60%] h-[40%] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-20%] w-[70%] h-[50%] bg-success/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm mt-10 animate-in slide-in-from-top-8 fade-in duration-700">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
            <Image
              src="/novafit-logo.jpg"
              alt="NovaFit Logo"
              width={48}
              height={48}
              className="w-full h-full object-contain rounded-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">NovaFit</h1>
        </div>
        <p className="text-muted-foreground text-lg">Tu gimnasio, en tu bolsillo.</p>
      </div>

      <div className="w-full max-w-sm flex-1 flex flex-col justify-center animate-in zoom-in-95 fade-in duration-700 delay-150">
        <div className="glass-strong p-8 rounded-[32px] shadow-2xl relative overflow-hidden border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

          <h2 className="text-2xl font-bold mb-6 text-white relative z-10">Ingresa a tu cuenta</h2>

          <form method="POST" onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">
            {error && (
              <div
                role="alert"
                className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
              >
                {error}
              </div>
            )}

            <div className="input-group">
              <label
                className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase"
                htmlFor="username"
              >
                Usuario NovaFit
              </label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                  placeholder="Ej: AB12-3456"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label
                className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  className="input pl-12 pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                  placeholder="••••••••"
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

            <button
              type="submit"
              className="btn h-14 rounded-2xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
            >
              Iniciar Sesión
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>

      <div className="w-full max-w-sm pb-8 text-center animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
        <p className="text-sm text-muted-foreground">
          ¿Es tu primera vez? <span className="text-white font-medium">Pide tu enlace de registro en recepción</span>
        </p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-radial flex items-center justify-center"><div className="spinner" /></div>}>
      <MemberAppContent />
    </Suspense>
  )
}
