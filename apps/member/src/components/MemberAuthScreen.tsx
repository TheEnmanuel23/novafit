'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  checkPasswordResetEligibility,
  resetMemberPassword,
  signInMember,
} from '@/app/actions/auth'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, UserIcon } from './Icons'

type ResetMode = 'lookup' | 'admin_unlocked' | 'self_service'

export function MemberAuthScreen({ initialUsername = '' }: { initialUsername?: string }) {
  const router = useRouter()
  const baseId = useId()
  const [isRefreshing, startTransition] = useTransition()

  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password reset state
  const [isResetView, setIsResetView] = useState(false)
  const [resetMode, setResetMode] = useState<ResetMode>('lookup')
  const [resetMemberName, setResetMemberName] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)

  const completeAuthentication = () => {
    startTransition(() => {
      if (typeof window !== 'undefined' && window.location.search) {
        router.replace('/')
      }
      router.refresh()
    })
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const cleanUsername = username.trim().toUpperCase()
    if (!cleanUsername || !password) {
      setError('Por favor ingresa tu usuario y contraseña.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('username', cleanUsername)
      formData.set('password', password)

      const result = await signInMember(formData)
      if (result.error || !result.dashboard) {
        setError(result.error || 'Credenciales inválidas.')
        return
      }

      completeAuthentication()
    } catch {
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartReset = () => {
    setIsResetView(true)
    setResetMode('lookup')
    setResetError(null)
  }

  const handleBackToLogin = () => {
    setIsResetView(false)
    setResetMode('lookup')
    setResetError(null)
  }

  const handleCheckResetEligibility = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetError(null)

    const cleanUsername = username.trim().toUpperCase()
    if (!cleanUsername) {
      setResetError('Por favor ingresa tu ID de usuario NovaFit.')
      return
    }

    setIsResetSubmitting(true)
    try {
      const res = await checkPasswordResetEligibility(cleanUsername)
      if (res.error || !res.mode) {
        setResetError(res.error || 'No se pudo verificar la cuenta.')
        return
      }

      setUsername(res.username || cleanUsername)
      setResetMemberName(res.name || '')
      setResetMode(res.mode)
    } catch {
      setResetError('Error al verificar la cuenta. Intenta nuevamente.')
    } finally {
      setIsResetSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetError(null)

    const formData = new FormData(event.currentTarget)
    formData.set('username', username.trim().toUpperCase())

    const newPw = String(formData.get('password') ?? '')
    const confirmPw = String(formData.get('confirmPassword') ?? '')

    if (newPw.length < 6) {
      setResetError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPw !== confirmPw) {
      setResetError('Las contraseñas no coinciden.')
      return
    }

    setIsResetSubmitting(true)
    try {
      const res = await resetMemberPassword(formData)
      if (res.error || !res.dashboard) {
        setResetError(res.error || 'No se pudo restablecer la contraseña.')
        return
      }

      completeAuthentication()
    } catch {
      setResetError('Ocurrió un error al restablecer la contraseña.')
    } finally {
      setIsResetSubmitting(false)
    }
  }

  const isBusy = isSubmitting || isRefreshing
  const isResetBusy = isResetSubmitting || isRefreshing

  return (
    <div className="min-h-dvh bg-gradient-radial flex flex-col justify-between items-center p-6 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-[5%] right-[-10%] w-[60%] h-[40%] bg-accent/20 rounded-full blur-[100px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[10%] left-[-20%] w-[70%] h-[50%] bg-success/10 rounded-full blur-[120px] pointer-events-none"
      />

      <header className="w-full max-w-sm mt-10">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
            <Image
              src="/novafit-logo.jpg"
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-contain rounded-lg"
              priority
            />
          </div>
          <span className="text-3xl font-black tracking-tight text-white">NovaFit</span>
        </div>
        <p className="text-muted-foreground text-lg">Tu gimnasio, en tu bolsillo.</p>
      </header>

      <main className="w-full max-w-sm flex-1 flex flex-col justify-center my-6">
        <div className="glass-strong p-8 rounded-[32px] shadow-2xl relative overflow-hidden border-white/10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"
          />

          {isResetView ? (
            <div className="relative z-10 flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {resetMode === 'lookup'
                    ? 'Ingresa tu ID de usuario para continuar.'
                    : resetMode === 'admin_unlocked'
                      ? 'Cambio autorizado en recepción. Crea tu nueva contraseña.'
                      : 'Confirma tu teléfono y fecha de nacimiento registrados.'}
                </p>
              </div>

              {resetError && (
                <div
                  role="alert"
                  className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
                >
                  {resetError}
                </div>
              )}

              {resetMode === 'lookup' ? (
                <form method="POST" onSubmit={handleCheckResetEligibility} className="flex flex-col gap-4">
                  <div className="input-group">
                    <label className="input-label text-[11px]" htmlFor={`${baseId}-reset-username`}>
                      Usuario NovaFit
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon size={18} className="absolute left-4 text-muted-foreground pointer-events-none" />
                      <input
                        id={`${baseId}-reset-username`}
                        name="username"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value)
                          if (resetError) setResetError(null)
                        }}
                        autoComplete="username"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="done"
                        required
                        className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium uppercase"
                        placeholder="Ej: AB12-3456"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isResetBusy}
                    className="btn h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]"
                  >
                    {isResetBusy ? 'Verificando...' : 'Continuar'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="btn btn-ghost min-h-11 rounded-2xl text-xs font-semibold"
                  >
                    Volver a Iniciar Sesión
                  </button>
                </form>
              ) : (
                <form
                  method="POST"
                  onSubmit={handleResetPasswordSubmit}
                  onInput={() => resetError && setResetError(null)}
                  className="flex flex-col gap-4"
                >
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground block">Cuenta</span>
                      <span className="text-white font-semibold">{resetMemberName}</span>{' '}
                      <span className="text-accent font-mono">({username})</span>
                    </div>
                    {resetMode === 'admin_unlocked' && (
                      <span className="badge badge-active text-[10px]">Autorizado</span>
                    )}
                  </div>

                  {resetMode === 'self_service' && (
                    <>
                      <div className="input-group">
                        <label className="input-label text-[11px] !mb-1" htmlFor={`${baseId}-reset-phone`}>
                          Teléfono Registrado
                        </label>
                        <input
                          id={`${baseId}-reset-phone`}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          enterKeyHint="next"
                          required
                          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                          placeholder="Ej: 8888-8888"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label text-[11px] !mb-1" htmlFor={`${baseId}-reset-dob`}>
                          Fecha de Nacimiento
                        </label>
                        <input
                          id={`${baseId}-reset-dob`}
                          name="date_of_birth"
                          type="date"
                          autoComplete="bday"
                          required
                          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                        />
                      </div>
                    </>
                  )}

                  <div className="input-group">
                    <label className="input-label text-[11px] !mb-1" htmlFor={`${baseId}-reset-new-pw`}>
                      Nueva Contraseña
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id={`${baseId}-reset-new-pw`}
                        name="password"
                        type={showResetPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={6}
                        enterKeyHint="next"
                        required
                        className="input pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword((p) => !p)}
                        aria-pressed={showResetPassword}
                        aria-label={showResetPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white"
                      >
                        {showResetPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label text-[11px] !mb-1" htmlFor={`${baseId}-reset-confirm-pw`}>
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      id={`${baseId}-reset-confirm-pw`}
                      name="confirmPassword"
                      type={showResetPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={6}
                      enterKeyHint="done"
                      required
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                      placeholder="Repite tu contraseña"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetBusy}
                    className="btn h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]"
                  >
                    {isResetBusy ? 'Guardando...' : 'Actualizar Contraseña'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="btn btn-ghost min-h-11 rounded-2xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </form>
              )}

              {resetMode !== 'admin_unlocked' && (
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-muted-foreground leading-relaxed text-center">
                  ¿No configuraste o no recuerdas tu teléfono y fecha de nacimiento?{' '}
                  <span className="text-white font-semibold">
                    Solicita en recepción que autoricen el restablecimiento de tu contraseña.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-6 text-white relative z-10">Ingresa a tu cuenta</h1>

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
                  <label className="input-label text-[11px]" htmlFor={`${baseId}-username`}>
                    Usuario NovaFit
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon size={18} className="absolute left-4 text-muted-foreground pointer-events-none" />
                    <input
                      id={`${baseId}-username`}
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
                      required
                      className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                      placeholder="Ej: AB12-3456"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="input-label !mb-0 text-[11px]" htmlFor={`${baseId}-password`}>
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={handleStartReset}
                      className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <LockIcon size={18} className="absolute left-4 text-muted-foreground pointer-events-none" />
                    <input
                      id={`${baseId}-password`}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError(null)
                      }}
                      autoComplete="current-password"
                      enterKeyHint="done"
                      required
                      className="input pl-12 pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="btn h-14 rounded-2xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] transition-all flex items-center justify-center gap-2 group"
                >
                  {isBusy ? 'Verificando...' : 'Iniciar Sesión'}
                  {!isBusy && (
                    <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="w-full max-w-sm pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          ¿Es tu primera vez?{' '}
          <span className="text-white font-medium">Pide tu enlace de registro en recepción</span>
        </p>
      </footer>
    </div>
  )
}

