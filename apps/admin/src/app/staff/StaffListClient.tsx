'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { StaffWithProfile } from '@novafit/types'

type StaffStatusFilter = 'active' | 'inactive' | 'deleted' | 'all'

export function StaffListClient({ staffList }: { staffList: StaffWithProfile[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('active')

  const counts = useMemo(() => {
    let active = 0
    let inactive = 0
    let deleted = 0

    for (const s of staffList) {
      if (s.deleted) {
        deleted++
      } else if (s.is_active === false) {
        inactive++
      } else {
        active++
      }
    }

    return { active, inactive, deleted, all: staffList.length }
  }, [staffList])

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()

    return staffList.filter((staff) => {
      const isDeleted = Boolean(staff.deleted)
      const isActive = !isDeleted && staff.is_active !== false

      if (statusFilter === 'active' && !isActive) return false
      if (statusFilter === 'inactive' && (isDeleted || isActive)) return false
      if (statusFilter === 'deleted' && !isDeleted) return false

      if (q) {
        const nameMatch = staff.name.toLowerCase().includes(q)
        const userMatch = staff.username.toLowerCase().includes(q)
        const emailMatch = (staff.email || '').toLowerCase().includes(q)
        const profileMatch = (staff.profile?.name || '').toLowerCase().includes(q)
        if (!nameMatch && !userMatch && !emailMatch && !profileMatch) return false
      }

      return true
    })
  }, [staffList, search, statusFilter])

  const filters: { key: StaffStatusFilter; label: string; count: number }[] = [
    { key: 'active', label: 'Activos', count: counts.active },
    { key: 'inactive', label: 'Inactivos', count: counts.inactive },
    { key: 'deleted', label: 'Eliminados', count: counts.deleted },
    { key: 'all', label: 'Todos', count: counts.all },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="glass p-2 flex gap-2">
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 border-none bg-transparent h-10 w-full focus:ring-0 shadow-none"
            placeholder="Buscar por nombre o usuario..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const isSelected = statusFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-accent text-white border-accent shadow-md shadow-accent/25'
                  : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-muted-foreground'
                }`}
              >
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        {filteredStaff.map((staff) => {
          const isDeleted = Boolean(staff.deleted)
          const isActive = !isDeleted && staff.is_active !== false

          const cardContent = (
            <>
              <div>
                <div className="font-semibold group-hover:text-accent transition-colors flex items-center gap-2 flex-wrap">
                  {staff.name}
                  {isActive && staff.is_online && (
                    <span
                      className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                      title="Online"
                    />
                  )}
                  {isDeleted ? (
                    <span className="badge badge-expired !text-[10px]">Eliminado</span>
                  ) : !isActive ? (
                    <span className="badge badge-warning !text-[10px]">Inactivo</span>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{staff.username}</div>
              </div>
              <div className="text-right">
                <span className="badge badge-active">{staff.profile.name}</span>
                <div className="text-sm text-muted-foreground mt-1">{staff.email}</div>
              </div>
            </>
          )

          if (isDeleted) {
            return (
              <div
                key={staff.id}
                className="glass p-4 flex justify-between items-center opacity-55"
              >
                {cardContent}
              </div>
            )
          }

          return (
            <Link
              key={staff.id}
              href={`/staff/${staff.id}`}
              className={`glass p-4 flex justify-between items-center hover-lift group ${
                !isActive ? 'opacity-70' : ''
              }`}
            >
              {cardContent}
            </Link>
          )
        })}

        {filteredStaff.length === 0 && (
          <div className="text-center p-8 text-muted-foreground text-sm glass rounded-2xl">
            {staffList.length === 0
              ? 'No hay staff registrados aún.'
              : statusFilter === 'active'
              ? 'No hay staff activos que coincidan con la búsqueda.'
              : statusFilter === 'inactive'
              ? 'No hay cuentas de staff inactivas.'
              : statusFilter === 'deleted'
              ? 'No hay cuentas de staff eliminadas.'
              : 'No se encontraron empleados con esa búsqueda.'}
          </div>
        )}
      </div>
    </div>
  )
}

