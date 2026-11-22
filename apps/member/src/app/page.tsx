'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { isPlanActive, isPlanExpired, isPlanScheduled } from '@novafit/supabase/src/utils/member'
import { formatDateOnly, formatDateTime, calcExpirationDate } from '@novafit/supabase/src/utils/date'
import {
  signInMember,
  signOutMember,
  getAuthenticatedMemberDashboard,
  type MemberDashboardData,
} from './actions/auth'

function MemberAppContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialUsername = searchParams.get('id') || searchParams.get('username') || ''
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [dashboard, setDashboard] = useState<MemberDashboardData | null>(null)

  useEffect(() => {
    const paramUser = searchParams.get('id') || searchParams.get('username')
    if (paramUser && !username) {
      setUsername(paramUser)
    }
  }, [searchParams, username])

  useEffect(() => {
    let active = true
    getAuthenticatedMemberDashboard()
      .then((data) => {
        if (active && data) {
          setDashboard(data)
        }
      })
      .finally(() => {
        if (active) setIsCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

      if (searchParams.toString()) {
        router.replace('/')
      }

      setDashboard(result.dashboard)
    } catch {
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await signOutMember()
    setDashboard(null)
    setPassword('')
    setShowPassword(false)
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-radial flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (dashboard) {
    const { member, planHistory, attendances, appDateISO } = dashboard
    const appDate = new Date(appDateISO)
    const scheduledPlans = member.scheduled_plans ?? []

    const activePlanBaseDays =
      member.active_plan?.plan?.key === 'day'
        ? member.active_plan.visits_purchased || member.active_plan.plan?.visits_included || 1
        : member.active_plan?.plan?.visits_included
    const activePlanBaseEndDate =
      member.active_plan && (member.active_plan as any).starts_at && activePlanBaseDays
        ? calcExpirationDate((member.active_plan as any).starts_at, activePlanBaseDays)
        : member.active_plan?.expiration_date

    return (
      <div className="min-h-screen bg-gradient-radial relative overflow-hidden">
        <div className="app-container">
          <header className="page-header items-center gap-4 border-b border-border pb-4">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
              <Image
                src="/novafit-logo.jpg"
                alt="NovaFit Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{member.name}</h1>
              <p className="text-muted-foreground text-xs">{member.username}</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          </header>

          <main className="page-content mt-6 flex flex-col gap-6">
            {/* Información del Miembro */}
            <div className="glass p-6 rounded-xl flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Información del Miembro</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{member.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{member.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID de Usuario</p>
                  <p className="font-medium">{member.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium capitalize">{member.status}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-4 border-t border-white/5 text-[10px] text-muted-foreground">
                <div>
                  <span className="uppercase tracking-wider block mb-0.5">Registro</span>
                  <span className="text-white/80">{member.creator?.name || 'Sistema'}</span> • {formatDateTime(member.created_at)}
                </div>
                {member.updated_at && member.updated_at !== member.created_at && (
                  <div>
                    <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                    <span className="text-white/80">{member.updater?.name || 'Sistema'}</span> • {formatDateTime(member.updated_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Activo */}
            {member.active_plan ? (
              <div className="glass p-6 rounded-xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Plan Activo</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan</p>
                    <p className="font-medium">{member.active_plan.plan?.description}</p>
                  </div>
                  <div className="row-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Estado de Días</p>
                    <div className="flex flex-col gap-2 p-3 bg-black/10 rounded border border-white/5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Compradas (Total)</span>
                        <span className="font-medium">{member.active_plan.visits_purchased}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Usadas</span>
                        <span className="font-medium">{(member.active_plan as any).visits_used}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-white/5 pt-1 mt-1">
                        <span className="text-muted-foreground">Disponibles / Restantes</span>
                        <span className="font-medium text-accent">{member.active_plan.visits_remaining}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fechas</p>
                    <div className="text-sm flex flex-col gap-1">
                      <p>
                        <span className="text-muted-foreground w-28 inline-block">Inicio:</span>{' '}
                        <span className="font-medium">{formatDateOnly((member.active_plan as any).starts_at)}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground w-28 inline-block">Fecha de corte:</span>{' '}
                        <span className="font-medium">{formatDateOnly(activePlanBaseEndDate)}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground w-28 inline-block">Expira:</span>{' '}
                        <span className="font-medium">{formatDateOnly(member.active_plan.expiration_date)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-4 border-t border-white/5 text-[10px] text-muted-foreground">
                  <div>
                    <span className="uppercase tracking-wider block mb-0.5">Registro</span>
                    <span className="text-white/80">{(member.active_plan as any).creator?.name || 'Sistema'}</span> • {formatDateTime((member.active_plan as any).created_at)}
                  </div>
                  {(member.active_plan as any).updated_at &&
                    (member.active_plan as any).updated_at !== (member.active_plan as any).created_at && (
                      <div>
                        <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                        <span className="text-white/80">{(member.active_plan as any).updater?.name || 'Sistema'}</span> • {formatDateTime((member.active_plan as any).updated_at)}
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="glass p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
                <h2 className="text-xl font-bold text-muted-foreground">Sin Plan Activo Hoy</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {scheduledPlans.length > 0
                    ? 'Tienes un plan programado para iniciar próximamente.'
                    : 'No tienes un plan activo en este momento. Consulta en recepción para asignar o renovar tu plan.'}
                </p>
              </div>
            )}

            {/* Planes Programados */}
            {scheduledPlans.length > 0 && (
              <div className="glass p-6 rounded-xl flex flex-col gap-4 border border-warning/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {scheduledPlans.length === 1 ? 'Plan Programado' : 'Planes Programados'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-warning/20 text-warning border border-warning/30">
                      {scheduledPlans.length} en espera
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {scheduledPlans.map((sp: any) => (
                    <div key={sp.id} className="p-4 rounded-xl bg-black/25 border border-warning/20 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-sm">{sp.plan?.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Inicia: <span className="text-warning font-medium">{formatDateOnly(sp.starts_at)}</span> • Expira:{' '}
                            <span className="text-white/90 font-medium">{formatDateOnly(sp.expiration_date)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Días Comprados</p>
                          <p className="text-xs font-medium">
                            {sp.visits_purchased} <span className="text-muted-foreground font-normal">días</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Disponibles al Iniciar</p>
                          <p className="text-xs font-medium text-accent">
                            {sp.visits_purchased - sp.visits_used}{' '}
                            <span className="text-muted-foreground font-normal">días (+ rollover si aplica)</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de Planes */}
            <div className="glass p-6 rounded-xl flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Historial de Planes</h2>
              {planHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay planes registrados.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {planHistory.map((mp: any) => (
                    <div key={mp.id} className="p-4 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-2 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{mp.plan?.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Inicio: {formatDateOnly(mp.starts_at)} • Expira: {formatDateOnly(mp.expiration_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isPlanExpired(mp, appDate)
                                ? 'bg-error/20 text-error border border-error/20'
                                : isPlanScheduled(mp, appDate)
                                  ? 'bg-warning/20 text-warning border border-warning/20'
                                  : isPlanActive(mp, appDate)
                                    ? 'bg-accent/20 text-accent border border-accent/20'
                                    : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {isPlanExpired(mp, appDate)
                              ? 'expired'
                              : isPlanScheduled(mp, appDate)
                                ? 'programado'
                                : isPlanActive(mp, appDate)
                                  ? 'active'
                                  : mp.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-6 mt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comprados</p>
                          <p className="text-xs font-medium">
                            {mp.visits_purchased} <span className="text-muted-foreground font-normal">días</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usados</p>
                          <p className="text-xs font-medium">
                            {mp.visits_used} <span className="text-muted-foreground font-normal">días</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Disponibles / Restantes</p>
                          <p className="text-xs font-medium text-accent">
                            {mp.visits_purchased - mp.visits_used} <span className="text-muted-foreground font-normal">días</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-3 border-t border-white/5 text-[10px] text-muted-foreground">
                        <div>
                          <span className="uppercase tracking-wider block mb-0.5">Registro</span>
                          <span className="text-white/80">{mp.creator?.name || 'Sistema'}</span> • {formatDateTime(mp.created_at)}
                        </div>
                        {mp.updated_at && mp.updated_at !== mp.created_at && (
                          <div>
                            <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                            <span className="text-white/80">{mp.updater?.name || 'Sistema'}</span> • {formatDateTime(mp.updated_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Visitas */}
            <div className="glass p-6 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Historial de Visitas</h2>
                <span className="text-xs text-muted-foreground">
                  {attendances.length} {attendances.length === 1 ? 'visita' : 'visitas'}
                </span>
              </div>
              {attendances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay visitas registradas aún.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {attendances.map((att: any) => {
                    const isReentry = att.balance_before === att.balance_after
                    const checkinType = att.checkin_type || 'manual'
                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-lg bg-black/20 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{formatDateTime(att.scanned_at)}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                checkinType === 'qr'
                                  ? 'bg-accent/20 text-accent border border-accent/20'
                                  : checkinType === 'manual'
                                    ? 'bg-warning/20 text-warning border border-warning/20'
                                    : 'bg-white/10 text-white/70 border border-white/10'
                              }`}
                            >
                              {checkinType === 'qr'
                                ? 'QR'
                                : checkinType === 'manual'
                                  ? 'Manual'
                                  : checkinType === 'auto_assignment'
                                    ? 'Auto'
                                    : checkinType}
                            </span>
                            {isReentry && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-muted-foreground">
                                Reingreso
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Plan: <span className="text-white/80 font-medium">{att.member_plan?.plan?.description || 'N/A'}</span>
                            {' • '}
                            Registrado por: <span className="text-white/80">{att.registrar?.name || 'Kiosco'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:text-right">
                          <div className="bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 text-xs">
                            <span className="text-muted-foreground">Balance: </span>
                            <span className="text-muted-foreground">{att.balance_before}</span>
                            <span className="text-muted-foreground mx-1">→</span>
                            <span className="font-bold text-accent">{att.balance_after}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
              disabled={isSubmitting}
              className="btn h-14 rounded-2xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
              {!isSubmitting && (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              )}
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
