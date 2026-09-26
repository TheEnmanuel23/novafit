'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function MemberSortDropdown({ sort_by, order, params }: { sort_by: string, order: string, params: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSortChange = (newSortBy: string, newOrder: string) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('sort_by', newSortBy)
    nextParams.set('order', newOrder)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <label className="text-muted-foreground text-xs whitespace-nowrap">Ordenar por:</label>
      <select 
        value={sort_by}
        onChange={(e) => handleSortChange(e.target.value, order)}
        className="input w-auto h-8 py-0 pl-2 pr-8 text-xs appearance-none bg-surface/50 border-white/5"
      >
        <option value="created_at">Fecha de registro</option>
        <option value="name">Nombre</option>
        <option value="start_date">Fecha de inicio de plan</option>
        <option value="status">Estado</option>
        <option value="plan">Plan</option>
      </select>
      <select 
        value={order}
        onChange={(e) => handleSortChange(sort_by, e.target.value)}
        className="input w-auto h-8 py-0 pl-2 pr-8 text-xs appearance-none bg-surface/50 border-white/5"
      >
        <option value="desc">Descendente</option>
        <option value="asc">Ascendente</option>
      </select>
    </div>
  )
}
