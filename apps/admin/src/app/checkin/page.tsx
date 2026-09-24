'use client'

import { useState, useTransition, useEffect } from 'react'
import { manualCheckinAction, searchMembersAction } from '@/app/actions/checkin'

export default function CheckinPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    if (username.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const results = await searchMembersAction(username)
      setSearchResults(results)
    }, 300)
    return () => clearTimeout(timer)
  }, [username])

  const handleCheckin = (memberId?: string) => {
    startTransition(async () => {
      const res = await manualCheckinAction(username, memberId)
      setResult(res)
      if (res?.type === 'success' || res?.type === 'no_visits') {
        setUsername('')
      }
    })
  }

  if (result?.type === 'needs_selection') {
    return (
      <div className="app-container p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="glass p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold mb-4">Selecciona el miembro</h2>
          <p className="text-sm text-muted-foreground mb-6">Múltiples miembros coinciden con "{username}":</p>
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {result.members.map((m: any) => (
              <button 
                key={m.id}
                onClick={() => handleCheckin(m.id)}
                disabled={isPending}
                className="p-4 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 flex flex-col text-left transition-colors relative"
              >
                <span className="font-semibold">{m.name}</span>
                <span className="text-xs text-muted-foreground mt-1">ID: {m.username} • Tel: {m.phone || 'N/A'}</span>
                {m.status !== 'active' && m.status !== 'low_balance' && (
                  <span className="absolute top-4 right-4 text-[10px] bg-error/20 text-error px-2 py-0.5 rounded font-bold uppercase">
                    Expirado
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setResult(null)} className="btn btn-secondary w-full mt-6" disabled={isPending}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }
  
  if (result) {
    return (
      <div className={`feedback-screen ${result.type === 'success' ? 'success' : result.type === 'no_visits' ? 'warning' : 'error'}`}>
        <div className={`feedback-icon ${result.type === 'success' ? 'success' : result.type === 'no_visits' ? 'warning' : 'error'}`}>
          {result.type === 'success' ? '✓' : '!'}
        </div>
        
        <div className="text-center">
          <h2 className="feedback-name">{result.member?.name || 'Error'}</h2>
          <p className="text-muted-foreground mt-2">{result.message}</p>
        </div>
        
        {(result.type === 'success' || result.type === 'no_visits') && (
          <div className="glass-strong p-6 text-center w-full max-w-sm mt-4">
            <div className="feedback-label mb-4">Visitas Restantes</div>
            <div className="feedback-balance text-white">{result.balance_after}</div>
          </div>
        )}

        <button 
          onClick={() => setResult(null)} 
          className="btn btn-ghost btn-lg w-full max-w-sm mt-8"
        >
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <div className="app-container p-4 flex flex-col h-screen">
      <div className="flex justify-between items-center mb-6 pt-4 relative z-10">
        <h1 className="text-xl font-bold tracking-tight">Kiosco de Visitas</h1>
        <div className="bg-surface rounded-full p-1 flex gap-1 border border-border">
          <button 
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'qr' ? 'bg-accent text-white' : 'text-muted-foreground'}`}
            onClick={() => setMode('qr')}
          >
            Escáner QR
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-accent text-white' : 'text-muted-foreground'}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-16">
        {mode === 'qr' ? (
          <div className="glass w-full max-w-sm aspect-square flex flex-col items-center justify-center p-6 border-accent/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/5 animate-pulse"></div>
            {/* The QR scanner will go here using html5-qrcode */}
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent mb-4"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
            <p className="text-center font-medium relative z-10 text-lg">Muestra tu código QR a la cámara</p>
          </div>
        ) : (
          <div className="glass w-full max-w-sm p-6 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Buscar Miembro</h2>
              <p className="text-muted-foreground text-sm mt-1">Busca por nombre, teléfono o ID</p>
            </div>
            
            <div className="relative">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCheckin();
              }} className="flex flex-col gap-4 relative z-20">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input text-center text-xl font-bold tracking-wide placeholder:text-muted/30 h-16" 
                  placeholder="Juan Perez..."
                  autoFocus
                  disabled={isPending}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={username.length < 3 || isPending}>
                  {isPending ? 'Buscando...' : 'Registrar Visita'}
                </button>
              </form>

              {searchResults.length > 0 && username.length >= 2 && (
                <div className="absolute top-[72px] left-0 right-0 bg-[#151720] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-64 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleCheckin(m.id)}
                      disabled={isPending}
                      className="w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex justify-between items-center group"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm group-hover:text-accent transition-colors">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">ID: {m.username} • Tel: {m.phone || 'Sin teléfono'}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          m.status === 'active' ? 'bg-accent/20 text-accent' : 
                          m.status === 'low_balance' ? 'bg-warning/20 text-warning' : 
                          'bg-error/20 text-error'
                        }`}>
                          {m.status === 'active' || m.status === 'low_balance' ? 'Activo' : 'Expirado'}
                        </span>
                        {m.active_plan && (
                          <span className="text-[10px] font-medium text-muted-foreground mt-1">
                            {m.active_plan.visits_remaining} visitas
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
