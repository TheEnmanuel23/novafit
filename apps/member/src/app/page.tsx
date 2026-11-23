'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'qrcode'
import { MemberProfileCards } from '@novafit/ui'
import { toPeriodYYYYMMDD } from '@novafit/supabase/src/utils/date'
import {
  signInMember,
  signOutMember,
  getAuthenticatedMemberDashboard,
  updateMyMemberProfile,
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

  // QR Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

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

  // Generate high-contrast QR code encoding the member's ID when the QR modal opens
  useEffect(() => {
    if (isQrModalOpen && dashboard?.member?.username) {
      QRCode.toDataURL(dashboard.member.username, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0a0b0f',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err))
    }
  }, [isQrModalOpen, dashboard?.member?.username])

  const handleCloseQrModal = async () => {
    setIsQrModalOpen(false)
    // Refresh dashboard data in case the receptionist just scanned the member's QR
    const updated = await getAuthenticatedMemberDashboard()
    if (updated) {
      setDashboard(updated)
    }
  }

  const handleOpenEditModal = () => {
    if (!dashboard?.member) return
    setEditName(dashboard.member.name || '')
    setEditPhone(dashboard.member.phone || '')
    setEditDob(
      dashboard.member.date_of_birth
        ? toPeriodYYYYMMDD(dashboard.member.date_of_birth)
        : ''
    )
    setEditAddress(dashboard.member.address || '')
    setEditError(null)
    setIsEditModalOpen(true)
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEditError(null)

    if (!editName.trim()) {
      setEditError('El nombre es obligatorio.')
      return
    }

    setIsSavingProfile(true)
    try {
      const formData = new FormData()
      formData.set('name', editName)
      formData.set('phone', editPhone)
      formData.set('date_of_birth', editDob)
      formData.set('address', editAddress)

      const result = await updateMyMemberProfile(formData)
      if (result.error || !result.dashboard) {
        setEditError(result.error || 'No se pudieron guardar los cambios.')
        return
      }

      setDashboard(result.dashboard)
      setIsEditModalOpen(false)
    } catch {
      setEditError('Ocurrió un error al actualizar tu información.')
    } finally {
      setIsSavingProfile(false)
    }
  }

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
    setIsQrModalOpen(false)
    setIsEditModalOpen(false)
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

    return (
      <div className="min-h-screen bg-gradient-radial relative overflow-hidden">
        <div className="app-container">
          <header className="page-header items-center gap-3 border-b border-border pb-4">
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
              <h1 className="text-xl font-black tracking-tight text-white">NovaFit</h1>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="btn btn-primary min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                Mi QR
              </button>
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
            <MemberProfileCards
              member={member}
              planHistory={planHistory}
              attendances={attendances}
              appDate={appDate}
              showPlanAuditInfo={false}
              infoCardHeaderActions={
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="btn btn-ghost min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Editar
                </button>
              }
              emptyPlanDescription={
                scheduledPlans.length > 0
                  ? 'Tienes un plan programado para iniciar próximamente.'
                  : 'No tienes un plan activo en este momento. Consulta en recepción para asignar o renovar tu plan.'
              }
            />
          </main>
        </div>

        {/* Edit Member Information Modal */}
        {isEditModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSavingProfile && setIsEditModalOpen(false)}
          >
            <div
              className="bg-[#12141c] border border-white/15 w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Editar Información</h2>
                  <p className="text-xs text-muted-foreground">Actualiza tus datos personales</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                  aria-label="Cerrar edición de perfil"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <form method="POST" onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                {editError && (
                  <div
                    role="alert"
                    className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
                  >
                    {editError}
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label text-[11px]" htmlFor="edit-name">
                    Nombre Completo *
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoComplete="name"
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label text-[11px]" htmlFor="edit-phone">
                    Teléfono
                  </label>
                  <input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    autoComplete="tel"
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                    placeholder="Ej: 8888-8888"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label text-[11px]" htmlFor="edit-dob">
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="edit-dob"
                    name="date_of_birth"
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    autoComplete="bday"
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label text-[11px]" htmlFor="edit-address">
                    Dirección
                  </label>
                  <textarea
                    id="edit-address"
                    name="address"
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    autoComplete="street-address"
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl py-3 min-h-[76px] resize-y"
                    placeholder="Tu dirección o barrio"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSavingProfile}
                    className="btn btn-ghost flex-1 min-h-12 rounded-xl text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn btn-primary flex-1 min-h-12 rounded-xl text-sm font-bold"
                  >
                    {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Member QR Check-in Modal */}
        {isQrModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseQrModal}
          >
            <div
              className="bg-[#12141c] border border-white/15 w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Pase de Acceso QR</h2>
                  <p className="text-xs text-muted-foreground">Muestra este código en recepción</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseQrModal}
                  aria-label="Cerrar código QR"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Código QR de ${member.username}`}
                    className="w-60 h-60 object-contain"
                  />
                ) : (
                  <div className="w-60 h-60 flex items-center justify-center">
                    <div className="spinner" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">ID de Usuario</p>
                <p className="text-2xl font-black font-mono text-accent tracking-wider mt-0.5">
                  {member.username}
                </p>
                <p className="text-sm font-medium text-white/90 mt-1">{member.name}</p>
              </div>

              <button
                type="button"
                onClick={handleCloseQrModal}
                className="btn btn-ghost w-full min-h-12 rounded-2xl text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
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
