import type { ReactNode } from 'react'
import type { MemberWithStatus } from '@novafit/types'
import { isPlanActive, isPlanExpired, isPlanScheduled } from '@novafit/supabase/src/utils/member'
import { formatDateOnly, formatDateTime, calcExpirationDate } from '@novafit/supabase/src/utils/date'

export type MemberWithAudit = MemberWithStatus & {
  creator?: { name: string } | null
  updater?: { name: string } | null
}

export function MemberInfoCard({
  member,
  showAuditInfo = true,
}: {
  member: MemberWithAudit
  showAuditInfo?: boolean | undefined
}) {
  return (
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
      {showAuditInfo && (
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
      )}
    </div>
  )
}

export function MemberActivePlanCard({
  member,
  headerActions,
  emptyStateActions,
  emptyStateDescription,
  showAuditInfo = true,
}: {
  member: MemberWithAudit
  headerActions?: ReactNode | undefined
  emptyStateActions?: ReactNode | undefined
  emptyStateDescription?: string | undefined
  showAuditInfo?: boolean | undefined
}) {
  const scheduledPlans = member.scheduled_plans ?? []

  const activePlanBaseDays =
    member.active_plan?.plan?.key === 'day'
      ? member.active_plan.visits_purchased || member.active_plan.plan?.visits_included || 1
      : member.active_plan?.plan?.visits_included
  const activePlanBaseEndDate =
    member.active_plan && (member.active_plan as any).starts_at && activePlanBaseDays
      ? calcExpirationDate((member.active_plan as any).starts_at, activePlanBaseDays)
      : member.active_plan?.expiration_date

  if (!member.active_plan) {
    const defaultEmptyDesc =
      scheduledPlans.length > 0
        ? 'Este miembro tiene un plan programado para iniciar próximamente.'
        : 'Este miembro no tiene un plan activo.'

    return (
      <div className="glass p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl font-bold text-muted-foreground">Sin Plan Activo Hoy</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          {emptyStateDescription || defaultEmptyDesc}
        </p>
        {emptyStateActions}
      </div>
    )
  }

  return (
    <div className="glass p-6 rounded-xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Plan Activo</h2>
        {headerActions && <div className="flex gap-2">{headerActions}</div>}
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

      {showAuditInfo && (
        <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-4 border-t border-white/5 text-[10px] text-muted-foreground">
          <div>
            <span className="uppercase tracking-wider block mb-0.5">Registro</span>
            <span className="text-white/80">{(member.active_plan as any).creator?.name || 'Sistema'}</span> •{' '}
            {formatDateTime((member.active_plan as any).created_at)}
          </div>
          {(member.active_plan as any).updated_at &&
            (member.active_plan as any).updated_at !== (member.active_plan as any).created_at && (
              <div>
                <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                <span className="text-white/80">{(member.active_plan as any).updater?.name || 'Sistema'}</span> •{' '}
                {formatDateTime((member.active_plan as any).updated_at)}
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export function MemberScheduledPlansCard({
  scheduledPlans,
  renderPlanActions,
}: {
  scheduledPlans: any[]
  renderPlanActions?: ((scheduledPlan: any) => ReactNode) | undefined
}) {
  if (!scheduledPlans || scheduledPlans.length === 0) return null

  return (
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
              {renderPlanActions && (
                <div className="flex items-center gap-2">{renderPlanActions(sp)}</div>
              )}
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
  )
}

export function MemberPlanHistoryCard({
  planHistory,
  appDate,
  renderPlanActions,
  showAuditInfo = true,
}: {
  planHistory: any[]
  appDate: Date
  renderPlanActions?: ((plan: any) => ReactNode) | undefined
  showAuditInfo?: boolean | undefined
}) {
  return (
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
                  {renderPlanActions && renderPlanActions(mp)}
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
              {showAuditInfo && (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MemberAttendanceHistoryCard({ attendances }: { attendances: any[] }) {
  return (
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
  )
}

export function MemberProfileCards({
  member,
  planHistory,
  attendances,
  appDate,
  activePlanHeaderActions,
  emptyPlanActions,
  emptyPlanDescription,
  renderScheduledPlanActions,
  renderHistoryPlanActions,
  showPlanAuditInfo = true,
}: {
  member: MemberWithAudit
  planHistory: any[]
  attendances: any[]
  appDate: Date
  activePlanHeaderActions?: ReactNode | undefined
  emptyPlanActions?: ReactNode | undefined
  emptyPlanDescription?: string | undefined
  renderScheduledPlanActions?: ((scheduledPlan: any) => ReactNode) | undefined
  renderHistoryPlanActions?: ((plan: any) => ReactNode) | undefined
  showPlanAuditInfo?: boolean | undefined
}) {
  const scheduledPlans = member.scheduled_plans ?? []

  return (
    <>
      <MemberInfoCard member={member} showAuditInfo={showPlanAuditInfo} />
      <MemberActivePlanCard
        member={member}
        headerActions={activePlanHeaderActions}
        emptyStateActions={emptyPlanActions}
        emptyStateDescription={emptyPlanDescription}
        showAuditInfo={showPlanAuditInfo}
      />
      <MemberScheduledPlansCard
        scheduledPlans={scheduledPlans}
        renderPlanActions={renderScheduledPlanActions}
      />
      <MemberPlanHistoryCard
        planHistory={planHistory}
        appDate={appDate}
        renderPlanActions={renderHistoryPlanActions}
        showAuditInfo={showPlanAuditInfo}
      />
      <MemberAttendanceHistoryCard attendances={attendances} />
    </>
  )
}
