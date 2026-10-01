'use client'

import { useState, useTransition, useEffect } from 'react'
import { manualCheckinAction, searchMembersAction } from '@/app/actions/checkin'

export default function CheckinPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Auto-close feedback screen after 3 seconds for success, 5 for errors/warnings
  useEffect(() => {
    if (result && result.type !== 'needs_selection') {
      const timeout = setTimeout(() => {
        setResult(null)
      }, result.type === 'success' ? 3000 : 5000)
      return () => clearTimeout(timeout)
    }
  }, [result])

  useEffect(() => {
    if (username.length < 2) {
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      const results = await searchMembersAction(username)
      setSearchResults(results)
      setHasSearched(true)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [username])

  const notFound = hasSearched && !isSearching && searchResults.length === 0 && username.length >= 2;

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
  

  return (
    <div className="app-container p-4 flex flex-col h-screen">
      {result && result.type !== 'needs_selection' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`bg-[#151720] shadow-2xl rounded-2xl p-4 pr-12 flex items-center gap-4 border-t border-r border-b border-white/10 border-l-4 min-w-[300px] ${
            result.type === 'success' ? 'border-l-success' : 
            result.type === 'no_visits' ? 'border-l-warning' : 
            'border-l-error'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              result.type === 'success' ? 'bg-success/20 text-success' : 
              result.type === 'no_visits' ? 'bg-warning/20 text-warning' : 
              'bg-error/20 text-error'
            }`}>
              {result.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">{result.member?.name || 'Error'}</h3>
              <p className="text-muted-foreground text-xs leading-tight mt-0.5">{result.message}</p>
              {(result.type === 'success' || result.type === 'no_visits') && (
                <p className="text-xs font-semibold mt-1">
                  Visitas restantes: <span className="text-white">{result.balance_after}</span>
                </p>
              )}
            </div>
            
            <button 
              onClick={() => setResult(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}
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
                if (notFound || isSearching) return;
                handleCheckin();
              }} className="flex flex-col gap-4 relative z-20">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input text-center text-xl font-bold tracking-wide placeholder:text-muted/30 h-16" 
                  placeholder="Busca por nombre, teléfono o ID"
                  autoFocus
                  disabled={isPending}
                  autoComplete="off"
                />

                {notFound && (
                  <div className="bg-error/10 border border-error/20 rounded-lg p-3 text-center animate-in fade-in zoom-in duration-200">
                    <p className="text-error text-sm font-medium">
                      No se encontró ningún miembro activo con esa información.
                    </p>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={username.length < 3 || isPending || isSearching || notFound}>
                  {isPending || isSearching ? 'Buscando...' : 'Registrar Visita'}
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
                            {m.active_plan.visits_remaining} días restantes
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
