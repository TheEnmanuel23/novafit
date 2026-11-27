import Link from 'next/link'
import type { Member } from '@novafit/types'
import { AlertTriangleIcon } from './Icons'

export interface RecoveryInfoBannerProps {
  member: Pick<Member, 'phone' | 'date_of_birth'>
  onCompleteClick?: () => void
}

export function RecoveryInfoBanner({ member, onCompleteClick }: RecoveryInfoBannerProps) {
  if (member.phone && member.date_of_birth) {
    return null
  }

  const missingLabel =
    !member.phone && !member.date_of_birth
      ? 'Teléfono y Fecha de Nacimiento'
      : !member.phone
        ? 'Teléfono'
        : 'Fecha de Nacimiento'

  const ctaClassName =
    'btn min-h-9 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-warning text-black hover:bg-warning/90 shrink-0 self-end sm:self-center'

  return (
    <div
      role="status"
      className="p-4 rounded-2xl bg-warning/10 border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangleIcon size={18} />
        </div>
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-warning">Completa tus datos de recuperación</p>
          <p className="text-white/80 mt-0.5">
            Agrega tu {missingLabel} en tu información personal para poder recuperar tu contraseña
            automáticamente si la olvidas.
          </p>
        </div>
      </div>

      {onCompleteClick ? (
        <button type="button" onClick={onCompleteClick} className={ctaClassName}>
          Completar ahora
        </button>
      ) : (
        <Link href="/profile" className={ctaClassName}>
          Completar ahora
        </Link>
      )}
    </div>
  )
}

