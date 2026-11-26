import Link from 'next/link'
import { ChevronLeftIcon } from './Icons'

export function PageBackLink({
  href = '/',
  label = 'Volver a Plan Activo',
}: {
  href?: string
  label?: string
}) {
  return (
    <div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 min-h-9 px-1 text-xs font-semibold text-accent hover:text-accent-hover hover:underline transition-colors"
      >
        <ChevronLeftIcon size={14} />
        {label}
      </Link>
    </div>
  )
}

