'use client'

import { useState, useTransition, useEffect, useRef, useCallback, useId } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { manualCheckinAction, qrCheckinAction, searchMembersAction } from '@/app/actions/checkin'
import { UserDropdown } from '@/components/UserDropdown'

type Props = {
  canQR: boolean
  canManual: boolean
  staffName: string
}

type CheckinMember = {
  id?: string
  name?: string
  username?: string
  phone?: string | null
  status?: string
  active_plan?: {
    visits_remaining: number
  } | null
}

type QrScannerInstance = {
  isScanning: boolean
  getState?: () => number
  pause: (shouldPauseVideo?: boolean) => void
  resume: () => void
  stop: () => Promise<void>
  clear: () => void
  start: (
    cameraIdOrConfig: string | { facingMode: string },
    configuration: { fps: number; qrbox: { width: number; height: number }; aspectRatio: number },
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback: (errorMessage: string) => void
  ) => Promise<null | void>
}

type CheckinResult = {
  type: 'success' | 'no_visits' | 'error' | 'needs_selection'
  member?: CheckinMember
  members?: CheckinMember[]
  balance_after?: number
  message?: string
}

export function CheckinClient({ canQR, canManual, staffName }: Props) {
  // Default to the first available mode
  const defaultMode = canQR ? 'qr' : 'manual'
  const [mode, setMode] = useState<'qr' | 'manual'>(defaultMode)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchResults, setSearchResults] = useState<CheckinMember[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // QR Scanner states
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isScannerPaused, setIsScannerPaused] = useState(false)
  const [isProcessingQr, setIsProcessingQr] = useState(false)
  const scannerRef = useRef<QrScannerInstance | null>(null)
  const scanLockRef = useRef(false)
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 })
  const resumeCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Feedback modal dialog ref
  const resultDialogRef = useRef<HTMLDialogElement>(null)
  const resultTitleId = useId()
  const isFeedbackOpen = Boolean(result && result.type !== 'needs_selection')

  const pauseScanner = useCallback(() => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      // State 2 = SCANNING in html5-qrcode
      if (typeof scanner.getState === 'function' ? scanner.getState() === 2 : scanner.isScanning) {
        scanner.pause(true)
        setIsScannerPaused(true)
      }
    } catch {
      // ignore if scanner is already paused or stopped
    }
  }, [])

  const resumeScanner = useCallback(() => {
    const scanner = scannerRef.current
    setIsScannerPaused(false)
    if (!scanner) return
    try {
      // State 3 = PAUSED in html5-qrcode
      if (typeof scanner.getState === 'function' ? scanner.getState() === 3 : true) {
        scanner.resume()
      }
    } catch {
      // ignore if scanner is not paused or already stopped
    }
  }, [])

  const dismissResult = useCallback(() => {
    setResult((prev) => (prev && prev.type !== 'needs_selection' ? null : prev))
    if (resumeCooldownTimerRef.current) {
      clearTimeout(resumeCooldownTimerRef.current)
    }
    if (mode === 'qr') {
      resumeScanner()
    }
    resumeCooldownTimerRef.current = setTimeout(() => {
      scanLockRef.current = false
    }, 600)
  }, [mode, resumeScanner])

  const requestDismiss = useCallback(() => {
    const dialog = resultDialogRef.current
    if (dialog?.open) {
      dialog.close()
    } else {
      dismissResult()
    }
  }, [dismissResult])

  // Auto-close feedback modal after 3.5s for success, 5s for warnings/errors
  useEffect(() => {
    if (!isFeedbackOpen || !result) return
    const timeout = setTimeout(() => {
      requestDismiss()
    }, result.type === 'success' ? 3500 : 5000)
    return () => clearTimeout(timeout)
  }, [isFeedbackOpen, result, requestDismiss])

  // Synchronize native <dialog> top-layer state with feedback result
  useEffect(() => {
    const dialog = resultDialogRef.current
    if (!dialog) return

    if (isFeedbackOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isFeedbackOpen])

  // Handle native dialog close (Esc / closedby="any") + Safari light-dismiss fallback
  useEffect(() => {
    const dialog = resultDialogRef.current
    if (!dialog) return

    const handleClose = () => {
      dismissResult()
    }
    dialog.addEventListener('close', handleClose)

    let cleanupLightDismiss: (() => void) | undefined
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect()
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
      }
      let pressedOutside = false
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = e.target === dialog && isOutside(e)
      }
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && e.target === dialog && isOutside(e)) {
          dialog.close()
        }
        pressedOutside = false
      }
      dialog.addEventListener('pointerdown', onPointerDown)
      dialog.addEventListener('pointerup', onPointerUp)
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown)
        dialog.removeEventListener('pointerup', onPointerUp)
      }
    }

    return () => {
      dialog.removeEventListener('close', handleClose)
      cleanupLightDismiss?.()
    }
  }, [dismissResult])

  useEffect(() => {
    return () => {
      if (resumeCooldownTimerRef.current) {
        clearTimeout(resumeCooldownTimerRef.current)
      }
    }
  }, [])

  const handleQrScan = useCallback((decodedText: string) => {
    const now = Date.now()
    // Prevent duplicate triggers for the same QR within 4 seconds or while a scan/result is active
    if (
      scanLockRef.current ||
      (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 4000)
    ) {
      return
    }

    scanLockRef.current = true
    lastScannedRef.current = { text: decodedText, time: now }
    setIsProcessingQr(true)
    pauseScanner()

    qrCheckinAction(decodedText)
      .then((res) => {
        setResult(res as CheckinResult)
      })
      .catch(() => {
        setResult({
          type: 'error',
          message: 'Error inesperado al procesar el código QR.',
        })
      })
      .finally(() => {
        setIsProcessingQr(false)
      })
  }, [pauseScanner])

  // Start / stop camera when mode === 'qr'
  useEffect(() => {
    if (mode !== 'qr' || !canQR) {
      return
    }

    let isMounted = true
    let html5QrCode: QrScannerInstance | null = null

    async function startScanner() {
      setCameraError(null)
      setIsScannerPaused(false)
      scanLockRef.current = false
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
      } catch (err: unknown) {
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
      setIsScannerPaused(false)
      scannerRef.current = null
      if (html5QrCode) {
        const scanner = html5QrCode
        Promise.resolve()
          .then(() => {
            const state = typeof scanner.getState === 'function' ? scanner.getState() : null
            // Stop when SCANNING (2) or PAUSED (3)
            if (state === 2 || state === 3 || scanner.isScanning) {
              return scanner.stop()
            }
          })
          .then(() => scanner.clear())
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
      const res = (await manualCheckinAction(username, memberId)) as CheckinResult
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
          <p className="text-sm text-muted-foreground mb-6">Múltiples miembros coinciden con &ldquo;{username}&rdquo;:</p>
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {(result.members ?? []).map((m) => (
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

  const feedbackVariant =
    result?.type === 'success'
      ? {
          badge: 'Acceso Permitido',
          borderClass: 'border-success/40 shadow-[0_0_60px_-15px_rgba(34,197,94,0.45)]',
          badgeClass: 'bg-success/15 text-success border-success/30',
          iconWrapClass: 'bg-success/20 text-success ring-8 ring-success/10',
          buttonClass: 'btn-success',
        }
      : result?.type === 'no_visits'
        ? {
            badge: 'Sin Visitas Disponibles',
            borderClass: 'border-warning/40 shadow-[0_0_60px_-15px_rgba(245,158,11,0.45)]',
            badgeClass: 'bg-warning/15 text-warning border-warning/30',
            iconWrapClass: 'bg-warning/20 text-warning ring-8 ring-warning/10',
            buttonClass: 'bg-warning text-black hover:bg-warning/90',
          }
        : {
            badge: 'Acceso Denegado',
            borderClass: 'border-error/40 shadow-[0_0_60px_-15px_rgba(239,68,68,0.45)]',
            badgeClass: 'bg-error/15 text-error border-error/30',
            iconWrapClass: 'bg-error/20 text-error ring-8 ring-error/10',
            buttonClass: 'btn-error',
          }

  return (
    <div className="app-container p-4 flex flex-col h-screen">
      <dialog
        ref={resultDialogRef}
        aria-labelledby={resultTitleId}
        className="checkin-result-dialog"
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        {isFeedbackOpen && result && (
          <div
            className={`relative w-full rounded-3xl bg-[#12141d] border-2 p-7 sm:p-8 flex flex-col items-center text-center gap-5 ${feedbackVariant.borderClass}`}
          >
            <button
              type="button"
              onClick={requestDismiss}
              aria-label="Cerrar resultado"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 ${feedbackVariant.iconWrapClass}`}>
              {result.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : result.type === 'no_visits' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="8" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>

            <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${feedbackVariant.badgeClass}`}>
              {feedbackVariant.badge}
            </span>

            <div className="space-y-1.5">
              <h2 id={resultTitleId} className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {result.member?.name || 'Error de escaneo'}
              </h2>
              {result.member?.username && (
                <p className="text-xs font-medium text-muted-foreground tracking-wide">
                  ID: {result.member.username}
                </p>
              )}
              {result.message && (
                <p className="text-sm sm:text-base text-muted-foreground leading-snug pt-1">
                  {result.message}
                </p>
              )}
            </div>

            {typeof result.balance_after === 'number' && (
              <div className="w-full rounded-2xl bg-white/[0.04] border border-white/10 py-4 px-5 flex flex-col items-center gap-1">
                <span className="text-5xl font-black text-white tabular-nums leading-none">
                  {result.balance_after}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {result.balance_after === 1 ? 'Visita restante' : 'Visitas restantes'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={requestDismiss}
              autoFocus
              className={`btn w-full mt-1 ${feedbackVariant.buttonClass}`}
            >
              {mode === 'qr' ? 'Escanear siguiente' : 'Continuar'}
            </button>
          </div>
        )}
      </dialog>

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
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isProcessingQr || isScannerPaused
                    ? 'bg-accent'
                    : isCameraActive
                      ? 'bg-success animate-pulse'
                      : 'bg-warning'
                }`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isProcessingQr
                    ? 'Registrando visita...'
                    : isScannerPaused
                      ? 'Cámara en pausa — Escaneo completado'
                      : isCameraActive
                        ? 'Cámara activa — Escaneando'
                        : 'Iniciando cámara...'}
                </span>
              </div>
            </div>

            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/10 relative flex items-center justify-center">
              <div id="novafit-qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

              {(isProcessingQr || isScannerPaused) && isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/75 backdrop-blur-sm">
                  {isProcessingQr ? (
                    <>
                      <div className="spinner" />
                      <p className="text-sm font-semibold text-white">Verificando código QR...</p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Escáner en pausa
                    </p>
                  )}
                </div>
              )}

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
