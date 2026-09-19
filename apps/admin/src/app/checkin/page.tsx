'use client'

import { useState } from 'react'

export default function CheckinPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any | null>(null)
  
  if (result) {
    return (
      <div className={`feedback-screen ${result.type === 'success' ? 'success' : result.type === 'no_visits' ? 'warning' : 'error'}`}>
        <div className={`feedback-icon ${result.type === 'success' ? 'success' : result.type === 'no_visits' ? 'warning' : 'error'}`}>
          {result.type === 'success' ? '✓' : '!'}
        </div>
        
        <div className="text-center">
          <h2 className="feedback-name">{result.member?.nombre || 'Desconocido'}</h2>
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
      <div className="flex justify-between items-center mb-6 pt-4">
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
              <h2 className="text-lg font-semibold">Ingresa tu código</h2>
              <p className="text-muted-foreground text-sm mt-1">Ejemplo: ABCD-1234</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              // Placeholder for server action call
              setResult({
                type: 'success',
                member: { nombre: 'Enmanuel Jarquín' },
                balance_after: 14,
                message: '¡Bienvenido, Enmanuel!'
              });
            }} className="flex flex-col gap-4">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                className="input text-center text-2xl font-bold tracking-widest uppercase placeholder:text-muted/30 h-16" 
                placeholder="ABCD-1234"
                maxLength={9}
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={username.length < 9}>
                Registrar Visita
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
