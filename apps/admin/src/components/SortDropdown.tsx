'use client'

type SortDropdownProps = {
  sort_by: string
  order: 'asc' | 'desc'
  options: { value: string; label: string }[]
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void
}

export function SortDropdown({ sort_by, order, options, onSortChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <label className="text-muted-foreground text-xs whitespace-nowrap">Ordenar por:</label>
      <select 
        value={sort_by}
        onChange={(e) => onSortChange(e.target.value, order)}
        className="input w-auto h-8 py-0 pl-2 pr-8 text-xs appearance-none bg-surface/50 border-white/5"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSortChange(sort_by, order === 'desc' ? 'asc' : 'desc')}
        className="input w-auto h-8 py-0 px-3 text-xs flex items-center gap-1.5 bg-surface/50 border-white/5 hover:bg-white/10 transition-colors"
        title={order === 'desc' ? 'Cambiar a ascendente' : 'Cambiar a descendente'}
        aria-label={order === 'desc' ? 'Orden descendente' : 'Orden ascendente'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={order === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
        </svg>
        {order === 'desc' ? 'Descendente' : 'Ascendente'}
      </button>
    </div>
  )
}
