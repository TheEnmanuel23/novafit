'use client'

import { useEffect, useState } from 'react'

export function DevDateTools() {
  const [dateStr, setDateStr] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Only in development
    if (process.env.NODE_ENV === 'production') return

    const match = document.cookie.match(/(?:^|; )x-simulated-date=([^;]*)/)
    if (match && match[1]) {
      setDateStr(decodeURIComponent(match[1]).split('T')[0])
    }
  }, [])

  if (process.env.NODE_ENV === 'production') return null

  const handleApply = () => {
    if (dateStr) {
      document.cookie = `x-simulated-date=${encodeURIComponent(dateStr)}; path=/; max-age=864000`
    } else {
      document.cookie = `x-simulated-date=; path=/; max-age=0`
    }
    window.location.reload()
  }

  const handleReset = () => {
    setDateStr('')
    document.cookie = `x-simulated-date=; path=/; max-age=0`
    window.location.reload()
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 bg-accent text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-[100] flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Time Travel
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 bg-background border border-accent rounded-xl shadow-2xl p-4 z-[100] w-64 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-accent flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Dev Time Travel
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="input-group">
          <label className="input-label text-[10px]">Simular Fecha Actual</label>
          <input 
            type="date" 
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className="input bg-black/40 border-white/10 focus:border-accent text-sm py-1.5 px-2 h-auto rounded-lg" 
          />
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn btn-secondary flex-1 py-1 h-auto text-xs rounded-lg">
            Reset
          </button>
          <button onClick={handleApply} className="btn btn-primary flex-1 py-1 h-auto text-xs rounded-lg">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
