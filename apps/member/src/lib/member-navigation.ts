import type { MemberWithStatus } from '@novafit/types'

export type MemberNavIconKey = 'plan' | 'profile' | 'history' | 'calendar'

export interface MemberNavItem {
  href: '/' | '/profile' | '/plans' | '/attendances'
  label: string
  description: string
  icon: MemberNavIconKey
}

export const MEMBER_NAV_ITEMS: readonly MemberNavItem[] = [
  {
    href: '/',
    label: 'Plan Activo',
    description: 'Estado del plan y días disponibles',
    icon: 'plan',
  },
  {
    href: '/profile',
    label: 'Información del Miembro',
    description: 'Datos personales y contraseña',
    icon: 'profile',
  },
  {
    href: '/plans',
    label: 'Historial de Planes',
    description: 'Planes activos, pasados y programados',
    icon: 'history',
  },
  {
    href: '/attendances',
    label: 'Historial de Visitas',
    description: 'Registro de asistencias al gimnasio',
    icon: 'calendar',
  },
]

export const MEMBER_STATUS_META: Record<
  MemberWithStatus['status'],
  { label: string; badgeClass: string }
> = {
  active: { label: 'Activo', badgeClass: 'badge badge-active' },
  low_balance: { label: 'Días Bajos', badgeClass: 'badge badge-warning' },
  scheduled: { label: 'Programado', badgeClass: 'badge badge-warning' },
  expired: { label: 'Vencido', badgeClass: 'badge badge-expired' },
  no_plan: { label: 'Sin Plan', badgeClass: 'badge badge-no-plan' },
}

