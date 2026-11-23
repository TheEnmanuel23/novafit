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
  checkPasswordResetEligibility,
  resetMemberPassword,
  changeMyMemberPassword,
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

  // Forgot / Reset Password flow state
  const [isResetView, setIsResetView] = useState(false)
  const [resetMode, setResetMode] = useState<'lookup' | 'admin_unlocked' | 'self_service'>('lookup')
  const [resetMemberName, setResetMemberName] = useState('')
  const [resetPhone, setResetPhone] = useState('')
  const [resetDob, setResetDob] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)

  // QR Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Change Password Modal state (when already logged in)
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showChangePasswords, setShowChangePasswords] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
    setEditEmail(dashboard.member.email || '')
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
      formData.set('email', editEmail)
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

  const handleStartReset = () => {
    setIsResetView(true)
    setResetMode('lookup')
    setResetError(null)
    setResetPhone('')
    setResetDob('')
    setResetNewPassword('')
    setResetConfirmPassword('')
  }

  const handleBackToLogin = () => {
    setIsResetView(false)
    setResetMode('lookup')
    setResetError(null)
  }

  const handleCheckResetEligibility = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetError(null)

    if (resetNewPassword.length < 6) {
      setResetError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Las contraseñas no coinciden.')
      return
    }

    setIsResetSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('username', username.trim().toUpperCase())
      formData.set('phone', resetPhone)
      formData.set('date_of_birth', resetDob)
      formData.set('password', resetNewPassword)
      formData.set('confirmPassword', resetConfirmPassword)

      const res = await resetMemberPassword(formData)
      if (res.error || !res.dashboard) {
        setResetError(res.error || 'No se pudo restablecer la contraseña.')
        return
      }

      setIsResetView(false)
      setResetMode('lookup')
      setDashboard(res.dashboard)
    } catch {
      setResetError('Ocurrió un error al restablecer la contraseña.')
    } finally {
      setIsResetSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await signOutMember()
    setDashboard(null)
    setPassword('')
    setShowPassword(false)
    setIsQrModalOpen(false)
    setIsEditModalOpen(false)
    setIsChangePasswordModalOpen(false)
  }

  const handleOpenChangePasswordModal = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowChangePasswords(false)
    setChangePasswordError(null)
    setChangePasswordSuccess(false)
    setIsChangePasswordModalOpen(true)
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setChangePasswordError(null)

    if (newPassword.length < 6) {
      setChangePasswordError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('Las contraseñas nuevas no coinciden.')
      return
    }

    setIsChangingPassword(true)
    try {
      const formData = new FormData()
      formData.set('currentPassword', currentPassword)
      formData.set('newPassword', newPassword)
      formData.set('confirmPassword', confirmNewPassword)

      const res = await changeMyMemberPassword(formData)
      if (res.error) {
        setChangePasswordError(res.error)
        return
      }

      setChangePasswordSuccess(true)
    } catch {
      setChangePasswordError('Ocurrió un error al cambiar la contraseña.')
    } finally {
      setIsChangingPassword(false)
    }
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
    const isMissingRecoveryInfo = !member.phone || !member.date_of_birth

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
            {/* Warning Banner while Phone or Date of Birth is missing */}
            {isMissingRecoveryInfo && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-warning/10 border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  </div>
                  <div className="text-xs leading-relaxed">
                    <p className="font-bold text-warning">Completa tus datos de recuperación</p>
                    <p className="text-white/80 mt-0.5">
                      Agrega tu{' '}
                      {!member.phone && !member.date_of_birth
                        ? 'Teléfono y Fecha de Nacimiento'
                        : !member.phone
                          ? 'Teléfono'
                          : 'Fecha de Nacimiento'}{' '}
                      en tu información personal para poder recuperar tu contraseña automáticamente si la olvidas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="btn min-h-9 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-warning text-black hover:bg-warning/90 shrink-0 self-end sm:self-center"
                >
                  Completar ahora
                </button>
              </div>
            )}

            <MemberProfileCards
              member={member}
              planHistory={planHistory}
              attendances={attendances}
              appDate={appDate}
              showPlanAuditInfo={false}
              infoCardHeaderActions={
                <>
                  <button
                    type="button"
                    onClick={handleOpenChangePasswordModal}
                    className="btn btn-ghost min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Cambiar Contrasña
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="btn btn-ghost min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    Editar
                  </button>
                </>
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
                  <p className="text-xs text-muted-foreground">Actualiza tus datos personales y de recuperación</p>
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
                    Teléfono (usado para recuperar contraseña)
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
                    Fecha de Nacimiento (usada para recuperar contraseña)
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
                  <label className="input-label text-[11px]" htmlFor="edit-email">
                    Correo Electrónico
                  </label>
                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                    placeholder="Ej: correo@ejemplo.com"
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

        {/* Change Password Modal (when logged in) */}
        {isChangePasswordModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isChangingPassword && setIsChangePasswordModalOpen(false)}
          >
            <div
              className="bg-[#12141c] border border-white/15 w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Cambiar Contraseña</h2>
                  <p className="text-xs text-muted-foreground">Actualiza tu contraseña de acceso</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  disabled={isChangingPassword}
                  aria-label="Cerrar cambio de contraseña"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {changePasswordSuccess ? (
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">¡Contraseña actualizada!</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tu nueva contraseña ha sido guardada correctamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordModalOpen(false)}
                    className="btn btn-primary w-full min-h-12 rounded-xl text-sm font-bold mt-2"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <form method="POST" onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
                  {changePasswordError && (
                    <div
                      role="alert"
                      className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
                    >
                      {changePasswordError}
                    </div>
                  )}

                  <div className="input-group">
                    <label className="input-label text-[11px]" htmlFor="current-password">
                      Contraseña Actual *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="current-password"
                        name="currentPassword"
                        type={showChangePasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value)
                          if (changePasswordError) setChangePasswordError(null)
                        }}
                        autoComplete="current-password"
                        className="input pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowChangePasswords((p) => !p)}
                        aria-pressed={showChangePasswords}
                        aria-label={showChangePasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                        className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label text-[11px]" htmlFor="change-new-password">
                      Nueva Contraseña *
                    </label>
                    <input
                      id="change-new-password"
                      name="newPassword"
                      type={showChangePasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (changePasswordError) setChangePasswordError(null)
                      }}
                      autoComplete="new-password"
                      minLength={6}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label text-[11px]" htmlFor="change-confirm-password">
                      Confirmar Nueva Contraseña *
                    </label>
                    <input
                      id="change-confirm-password"
                      name="confirmPassword"
                      type={showChangePasswords ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value)
                        if (changePasswordError) setChangePasswordError(null)
                      }}
                      autoComplete="new-password"
                      minLength={6}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                      placeholder="Repite tu nueva contraseña"
                      required
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangePasswordModalOpen(false)}
                      disabled={isChangingPassword}
                      className="btn btn-ghost flex-1 min-h-12 rounded-xl text-sm font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="btn btn-primary flex-1 min-h-12 rounded-xl text-sm font-bold"
                    >
                      {isChangingPassword ? 'Actualizando...' : 'Actualizar clave'}
                    </button>
                  </div>
                </form>
              )}
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

          {isResetView ? (
            <div className="relative z-10 flex flex-col gap-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Recuperar contraseña</h2>
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
                    <label
                      className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase"
                      htmlFor="reset-username"
                    >
                      Usuario NovaFit
                    </label>
                    <div className="relative flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground pointer-events-none"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <input
                        id="reset-username"
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
                        className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium uppercase"
                        placeholder="Ej: AB12-3456"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="btn h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]"
                  >
                    {isResetSubmitting ? 'Verificando...' : 'Continuar'}
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
                <form method="POST" onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
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
                        <label
                          className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                          htmlFor="reset-phone"
                        >
                          Teléfono Registrado
                        </label>
                        <input
                          id="reset-phone"
                          name="phone"
                          type="tel"
                          value={resetPhone}
                          onChange={(e) => {
                            setResetPhone(e.target.value)
                            if (resetError) setResetError(null)
                          }}
                          autoComplete="tel"
                          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                          placeholder="Ej: 8888-8888"
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label
                          className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                          htmlFor="reset-dob"
                        >
                          Fecha de Nacimiento
                        </label>
                        <input
                          id="reset-dob"
                          name="date_of_birth"
                          type="date"
                          value={resetDob}
                          onChange={(e) => {
                            setResetDob(e.target.value)
                            if (resetError) setResetError(null)
                          }}
                          autoComplete="bday"
                          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="input-group">
                    <label
                      className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                      htmlFor="reset-new-password"
                    >
                      Nueva Contraseña
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="reset-new-password"
                        name="password"
                        type={showResetPassword ? 'text' : 'password'}
                        value={resetNewPassword}
                        onChange={(e) => {
                          setResetNewPassword(e.target.value)
                          if (resetError) setResetError(null)
                        }}
                        autoComplete="new-password"
                        minLength={6}
                        className="input pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword((p) => !p)}
                        aria-pressed={showResetPassword}
                        aria-label={showResetPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label
                      className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase !mb-1"
                      htmlFor="reset-confirm-password"
                    >
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => {
                        setResetConfirmPassword(e.target.value)
                        if (resetError) setResetError(null)
                      }}
                      autoComplete="new-password"
                      minLength={6}
                      className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-2xl h-12 text-white font-medium"
                      placeholder="Repite tu contraseña"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="btn h-14 rounded-2xl mt-2 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]"
                  >
                    {isResetSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}
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
                  <div className="flex justify-between items-center mb-1">
                    <label
                      className="input-label !mb-0 text-[11px] font-bold text-muted-foreground tracking-wider uppercase"
                      htmlFor="password"
                    >
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
            </>
          )}
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
