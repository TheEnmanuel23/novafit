'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { manualCheckinAction, qrCheckinAction, searchMembersAction } from '@/app/actions/checkin'
import { UserDropdown } from '@/components/UserDropdown'

type Props = {
  canQR: boolean
  canManual: boolean
  staffName: string
}

export function CheckinClient({ canQR, canManual, staffName }: Props) {
  // Default to the first available mode
  const defaultMode = canQR ? 'qr' : 'manual'
  const [mode, setMode] = useState<'qr' | 'manual'>(defaultMode)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // QR Scanner states
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessingQr, setIsProcessingQr] = useState(false)
  const scannerRef = useRef<any>(null)
  const scanLockRef = useRef(false)
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 })

  // Auto-close feedback screen after 3 seconds for success, 5 for errors/warnings
  useEffect(() => {
    if (result && result.type !== 'needs_selection') {
      const timeout = setTimeout(() => {
        setResult(null)
      }, result.type === 'success' ? 3000 : 5000)
      return () => clearTimeout(timeout)
    }
  }, [result])

  const handleQrScan = useCallback((decodedText: string) => {
    const now = Date.now()
    // Prevent duplicate triggers for the same QR within 4 seconds or while a scan is in flight
    if (
      scanLockRef.current ||
      (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 4000)
    ) {
      return
    }

    scanLockRef.current = true
    lastScannedRef.current = { text: decodedText, time: now }
    setIsProcessingQr(true)

    qrCheckinAction(decodedText)
      .then((res) => {
        setResult(res)
      })
      .catch(() => {
        setResult({
          type: 'error',
          message: 'Error inesperado al procesar el código QR.',
        })
      })
      .finally(() => {
        setIsProcessingQr(false)
        setTimeout(() => {
          scanLockRef.current = false
        }, 1800)
      })
  }, [])

  // Start / stop camera when mode === 'qr'
  useEffect(() => {
    if (mode !== 'qr' || !canQR) {
      return
    }

    let isMounted = true
    let html5QrCode: any = null

    async function startScanner() {
      setCameraError(null)
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!isMounted) return

        html5QrCode = new Html5Qrcode('novafit-qr-reader')
        scannerRef.current = html5QrCode

        const config = {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        }

        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText: string) => {
              if (isMounted) handleQrScan(decodedText)
            },
            () => {
              // ignore frame parse errors when no QR is in view
            }
          )
        } catch {
          // Fallback to any available camera (e.g. laptop webcam)
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText: string) => {
              if (isMounted) handleQrScan(decodedText)
            },
            () => {}
          )
        }

        if (isMounted) {
          setIsCameraActive(true)
        }
      } catch (err: any) {
        console.error('[QRScanner] Failed to start camera:', err)
        if (isMounted) {
          setIsCameraActive(false)
          setCameraError(
            'No se pudo acceder a la cámara. Verifica los permisos del navegador o usa el modo Manual.'
          )
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      setIsCameraActive(false)
      if (html5QrCode) {
        Promise.resolve(
          html5QrCode.isScanning ? html5QrCode.stop() : undefined
        )
          .then(() => html5QrCode.clear())
          .catch(() => {})
      }
    }
  }, [mode, canQR, handleQrScan])

  const debouncedSearch = useDebouncedCallback(async (val: string) => {
    const results = await searchMembersAction(val)
    setSearchResults(results)
    setHasSearched(true)
    setIsSearching(false)
  }, 300)

  const handleUsernameChange = (val: string) => {
    setUsername(val)
    if (val.length < 2) {
      debouncedSearch.cancel()
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debouncedSearch(val)
  }

  const notFound = hasSearched && !isSearching && searchResults.length === 0 && username.length >= 2

  const handleCheckin = (memberId?: string) => {
    startTransition(async () => {
      const res = await manualCheckinAction(username, memberId)
      setResult(res)
      if (res?.type === 'success' || res?.type === 'no_visits') {
        handleUsernameChange('')
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

        <div className="flex items-center gap-2">
          {/* Only show the toggle if both modes are available */}
          {canQR && canManual && (
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
          )}

          <UserDropdown userName={staffName} hideChangePassword />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        {mode === 'qr' ? (
          <div className="glass w-full max-w-sm flex flex-col items-center justify-center p-5 border-accent/30 relative overflow-hidden gap-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isCameraActive ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isProcessingQr
                    ? 'Registrando visita...'
                    : isCameraActive
                      ? 'Cámara activa — Escaneando'
                      : 'Iniciando cámara...'}
                </span>
              </div>
            </div>

            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/10 relative flex items-center justify-center">
              <div id="novafit-qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

              {!isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center pointer-events-none">
                  <div className="spinner" />
                  <p className="text-xs text-muted-foreground">Activando cámara...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/80">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-error"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  <p className="text-xs text-error font-medium">{cameraError}</p>
                </div>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Coloca el código QR del miembro frente a la cámara para registrar su visita automáticamente.
            </p>
          </div>
        ) : (
          <div className="glass w-full max-w-sm p-6 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Buscar Miembro</h2>
            </div>

            <div className="relative">
              <form onSubmit={(e) => {
                e.preventDefault()
                if (notFound || isSearching) return
                handleCheckin()
              }} className="flex flex-col gap-4 relative z-20">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="input text-center text-xl font-bold tracking-wide placeholder:text-muted/30 h-16"
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
