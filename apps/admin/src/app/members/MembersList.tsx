'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { compareAsc, compareDesc, parseISO } from 'date-fns'
import { SortDropdown } from '@/components/SortDropdown'
import { formatDateTime, formatDateOnly } from '@novafit/supabase/src/utils/date'

const MEMBER_SORT_OPTIONS = [
  { value: 'created_at', label: 'Fecha de registro' },
  { value: 'name', label: 'Nombre' },
  { value: 'start_date', label: 'Fecha de inicio de plan' },
  { value: 'status', label: 'Estado' },
  { value: 'plan', label: 'Plan' },
]

const STATUS_ORDER: Record<string, number> = {
  active: 1,
  low_balance: 2,
  expired: 3,
  no_plan: 4,
}

export function MembersList({ members }: { members: any[] }) {
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const sortedMembers = useMemo(() => {
    const isAsc = order === 'asc'
    return [...members].sort((a, b) => {
      if (sortBy === 'created_at') {
        const diff = compareAsc(parseISO(a.created_at), parseISO(b.created_at))
        return isAsc ? diff : -diff
      }
      if (sortBy === 'status') {
        const diff = (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99)
        return isAsc ? diff : -diff
      }
      let valA = ''
      let valB = ''
      if (sortBy === 'name') {
        valA = (a.name || '').toLowerCase()
        valB = (b.name || '').toLowerCase()
      } else if (sortBy === 'plan') {
        valA = (a.active_plan?.plan?.description || '').toLowerCase()
        valB = (b.active_plan?.plan?.description || '').toLowerCase()
      } else if (sortBy === 'start_date') {
        valA = a.active_plan?.starts_at || '0000-00-00'
        valB = b.active_plan?.starts_at || '0000-00-00'
      }
      if (valA < valB) return isAsc ? -1 : 1
      if (valA > valB) return isAsc ? 1 : -1
      return 0
    })
  }, [members, sortBy, order])

  return (
    <>
      <div className="flex mb-4">
        <SortDropdown
          sort_by={sortBy}
          order={order}
          options={MEMBER_SORT_OPTIONS}
          onSortChange={(newSortBy, newOrder) => {
            setSortBy(newSortBy)
            setOrder(newOrder)
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {sortedMembers.map((member: any) => {
          const displayPlan =
            member.active_plan ||
            (member.member_plans && member.member_plans.length > 0
              ? [...member.member_plans].sort((a, b) =>
                  compareDesc(parseISO(a.created_at), parseISO(b.created_at))
                )[0]
              : null)

          return (
            <Link key={member.id} href={`/members/${member.id}`} className="glass p-4 flex justify-between items-start hover-lift group">
              <div className="flex-1">
                <div className="font-semibold group-hover:text-accent transition-colors">{member.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {member.username} {member.phone && `• ${member.phone}`}
                </div>

                <div className="flex flex-col gap-1 mt-3">
                  <div className="text-[10px] text-muted-foreground">
                    <span className="font-medium text-white/70">Registrado el:</span> {formatDateTime(member.created_at)} por {member.creator?.name || 'Sistema'}
                  </div>
                  {displayPlan?.starts_at && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-white/70">Inicio de plan:</span> {formatDateOnly(displayPlan.starts_at)}
                      {displayPlan.expiration_date && (
                        <> <span className="font-medium text-white/70 ml-2">• Expira:</span> {formatDateOnly(displayPlan.expiration_date)}</>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <StatusBadge status={member.status} />

                {displayPlan && (
                  <div className="text-xs font-medium mt-1">
                    {displayPlan.plan?.description}
                  </div>
                )}

                {member.active_plan && (
                  <div className="text-sm font-medium mt-1">
                    {member.active_plan.visits_remaining} / {member.active_plan.visits_purchased} <span className="text-muted-foreground text-xs font-normal">días disponibles</span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}

        {sortedMembers.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            No hay miembros registrados aún.
          </div>
        )}
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: any }) {
  if (status === 'active') return <span className="badge badge-active">Activo</span>
  if (status === 'low_balance') return <span className="badge badge-warning">Por expirar</span>
  if (status === 'expired') return <span className="badge badge-expired">Expirado</span>
  return <span className="badge badge-no-plan">Sin Plan</span>
}

