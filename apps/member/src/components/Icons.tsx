import type { SVGProps } from 'react'
import type { MemberNavIconKey } from '@/lib/member-navigation'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function baseProps(size: number, props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
    ...props,
  }
}

export function QrCodeIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}

export function MenuIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}

export function CloseIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function CreditCardIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

export function UserIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function ClockIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

export function CalendarIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function AlertTriangleIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.2}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function LockIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function EditPenIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function LogOutIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

export function EyeIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export function CheckIcon({ size = 28, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function NavSectionIcon({ icon, size = 18 }: { icon: MemberNavIconKey; size?: number }) {
  switch (icon) {
    case 'plan':
      return <CreditCardIcon size={size} />
    case 'profile':
      return <UserIcon size={size} />
    case 'history':
      return <ClockIcon size={size} />
    case 'calendar':
      return <CalendarIcon size={size} />
  }
}

