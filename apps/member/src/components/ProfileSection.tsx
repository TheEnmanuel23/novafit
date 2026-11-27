'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MemberWithStatus } from '@novafit/types'
import { MemberInfoCard } from '@novafit/ui'
import { toPeriodYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { changeMyMemberPassword, updateMyMemberProfile } from '@/app/actions/auth'
import { CheckIcon, EditPenIcon, EyeIcon, EyeOffIcon, LockIcon } from './Icons'
import { ModalDialog } from './ModalDialog'
import { RecoveryInfoBanner } from './RecoveryInfoBanner'

export function ProfileSection({ member }: { member: MemberWithStatus }) {
  const router = useRouter()
  const baseId = useId()

  // Edit Profile Modal state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Change Password Modal state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const openEditModal = () => {
    setEditError(null)
    setIsEditOpen(true)
  }

  const openPasswordModal = () => {
    setPasswordError(null)
    setPasswordSuccess(false)
    setShowPasswords(false)
    setIsPasswordOpen(true)
  }

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditError(null)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    if (!name) {
      setEditError('El nombre es obligatorio.')
      return
    }

    setIsSavingProfile(true)
    try {
      const result = await updateMyMemberProfile(formData)
      if (result.error) {
        setEditError(result.error)
        return
      }
      setIsEditOpen(false)
      router.refresh()
    } catch {
      setEditError('Ocurrió un error al actualizar tu información.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.')
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changeMyMemberPassword(formData)
      if (result.error) {
        setPasswordError(result.error)
        return
      }
      setPasswordSuccess(true)
    } catch {
      setPasswordError('Ocurrió un error al cambiar la contraseña.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const defaultDob = member.date_of_birth ? toPeriodYYYYMMDD(member.date_of_birth) : ''

  return (
    <>
      <RecoveryInfoBanner member={member} onCompleteClick={openEditModal} />

      <MemberInfoCard
        member={member}
        showAuditInfo={false}
        headerActions={
          <>
            <button
              type="button"
              onClick={openPasswordModal}
              className="btn btn-ghost min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <LockIcon size={14} />
              Cambiar Contraseña
            </button>
            <button
              type="button"
              onClick={openEditModal}
              className="btn btn-ghost min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <EditPenIcon size={14} />
              Editar
            </button>
          </>
        }
      />

      {/* Edit Personal Information Dialog */}
      <ModalDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar Información"
        subtitle="Actualiza tus datos personales y de recuperación"
        preventDismiss={isSavingProfile}
      >
        <form
          key={`${member.updated_at}-${String(isEditOpen)}`}
          method="POST"
          onSubmit={handleSaveProfile}
          onInput={() => editError && setEditError(null)}
          className="flex flex-col gap-4"
        >
          {editError && (
            <div
              role="alert"
              className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
            >
              {editError}
            </div>
          )}

          <div className="input-group">
            <label className="input-label text-[11px]" htmlFor={`${baseId}-name`}>
              Nombre Completo <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${baseId}-name`}
              name="name"
              type="text"
              defaultValue={member.name}
              autoComplete="name"
              enterKeyHint="next"
              autoFocus
              required
              className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="input-group">
            <label className="input-label text-[11px]" htmlFor={`${baseId}-phone`}>
              Teléfono
            </label>
            <span id={`${baseId}-phone-hint`} className="text-[11px] text-muted-foreground -mt-1">
              Usado para recuperar tu contraseña si la olvidas.
            </span>
            <input
              id={`${baseId}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={member.phone ?? ''}
              autoComplete="tel"
              enterKeyHint="next"
              aria-describedby={`${baseId}-phone-hint`}
              className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
              placeholder="Ej: 8888-8888"
            />
          </div>

          <div className="input-group">
            <label className="input-label text-[11px]" htmlFor={`${baseId}-dob`}>
              Fecha de Nacimiento
            </label>
            <span id={`${baseId}-dob-hint`} className="text-[11px] text-muted-foreground -mt-1">
              Usada junto con tu teléfono para verificar tu identidad.
            </span>
            <input
              id={`${baseId}-dob`}
              name="date_of_birth"
              type="date"
              defaultValue={defaultDob}
              autoComplete="bday"
              aria-describedby={`${baseId}-dob-hint`}
              className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
            />
          </div>

          <div className="input-group">
            <label className="input-label text-[11px]" htmlFor={`${baseId}-email`}>
              Correo Electrónico
            </label>
            <input
              id={`${baseId}-email`}
              name="email"
              type="email"
              inputMode="email"
              defaultValue={member.email ?? ''}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
              placeholder="Ej: correo@ejemplo.com"
            />
          </div>

          <div className="input-group">
            <label className="input-label text-[11px]" htmlFor={`${baseId}-address`}>
              Dirección
            </label>
            <textarea
              id={`${baseId}-address`}
              name="address"
              rows={2}
              defaultValue={member.address ?? ''}
              autoComplete="street-address"
              className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl py-3 min-h-[76px] resize-y"
              placeholder="Tu dirección o barrio"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
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
      </ModalDialog>

      {/* Change Password Dialog */}
      <ModalDialog
        open={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        title="Cambiar Contraseña"
        subtitle="Actualiza tu contraseña de acceso"
        preventDismiss={isChangingPassword}
      >
        {passwordSuccess ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center">
              <CheckIcon size={28} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">¡Contraseña actualizada!</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tu nueva contraseña ha sido guardada correctamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordOpen(false)}
              autoFocus
              className="btn btn-primary w-full min-h-12 rounded-xl text-sm font-bold mt-2"
            >
              Listo
            </button>
          </div>
        ) : (
          <form
            key={String(isPasswordOpen)}
            method="POST"
            onSubmit={handleChangePassword}
            onInput={() => passwordError && setPasswordError(null)}
            className="flex flex-col gap-4"
          >
            {passwordError && (
              <div
                role="alert"
                className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium"
              >
                {passwordError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor={`${baseId}-current-pw`}>
                Contraseña Actual <span aria-hidden="true">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id={`${baseId}-current-pw`}
                  name="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="next"
                  autoFocus
                  required
                  className="input pr-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  aria-pressed={showPasswords}
                  aria-label={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white transition-colors"
                >
                  {showPasswords ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor={`${baseId}-new-pw`}>
                Nueva Contraseña <span aria-hidden="true">*</span>
              </label>
              <span id={`${baseId}-new-pw-hint`} className="text-[11px] text-muted-foreground -mt-1">
                Mínimo 6 caracteres.
              </span>
              <input
                id={`${baseId}-new-pw`}
                name="newPassword"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={6}
                enterKeyHint="next"
                aria-describedby={`${baseId}-new-pw-hint`}
                required
                className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="input-group">
              <label className="input-label text-[11px]" htmlFor={`${baseId}-confirm-pw`}>
                Confirmar Nueva Contraseña <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${baseId}-confirm-pw`}
                name="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={6}
                enterKeyHint="done"
                required
                className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl h-12"
                placeholder="Repite tu nueva contraseña"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsPasswordOpen(false)}
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
      </ModalDialog>
    </>
  )
}

