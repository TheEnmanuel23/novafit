'use client'

import { useEffect, useId, useRef, useCallback, type CSSProperties, type ReactNode } from 'react'
import { CloseIcon } from './Icons'

let cachedDisplayTransitionSupport: boolean | undefined

function canTransitionDisplay(): boolean {
  if (cachedDisplayTransitionSupport !== undefined) return cachedDisplayTransitionSupport
  if (typeof window === 'undefined' || !window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false
  }
  const probe = document.createElement('div')
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;'
  document.body.appendChild(probe)
  void getComputedStyle(probe).display
  probe.style.display = 'none'
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === 'block'
  probe.remove()
  return cachedDisplayTransitionSupport
}

function supportsTopLayerExit(): boolean {
  return typeof window !== 'undefined' && Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay()
}

async function closeDialogAnimated(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '')
    const animations = dialog.getAnimations({ subtree: true })
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ])
    }
    if (!dialog.hasAttribute('data-closing')) return
    dialog.removeAttribute('data-closing')
  }
  if (dialog.open) {
    dialog.close()
  }
}

export interface ModalDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  eyebrow?: string
  preventDismiss?: boolean
  maxWidth?: string
  children: ReactNode
}

export function ModalDialog({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  preventDismiss = false,
  maxWidth = '28rem',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current
    if (!dialog || preventDismiss) return
    void closeDialogAnimated(dialog)
  }, [preventDismiss])

  // Synchronize React `open` state with native `<dialog>` top-layer modality
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.removeAttribute('data-closing')
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      void closeDialogAnimated(dialog)
    }
  }, [open])

  // Sync close & cancel events and attach cross-browser light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      dialog.returnValue = ''
      dialog.removeAttribute('data-closing')
      onClose()
    }

    const handleCancel = (event: Event) => {
      if (preventDismiss) {
        event.preventDefault()
        return
      }
      if (event.cancelable) {
        event.preventDefault()
        void closeDialogAnimated(dialog)
      }
    }

    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleCancel)

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
        if (!preventDismiss && pressedOutside && e.target === dialog && isOutside(e)) {
          void closeDialogAnimated(dialog)
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
      dialog.removeEventListener('cancel', handleCancel)
      cleanupLightDismiss?.()
    }
  }, [onClose, preventDismiss])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      style={{ '--modal-max-w': maxWidth } as CSSProperties}
      className="modal-dialog rounded-3xl"
      {...({ closedby: preventDismiss ? 'none' : 'any' } as Record<string, string>)}
    >
      <div className="bg-[#12141c] border border-white/15 w-full rounded-3xl shadow-2xl p-6 flex flex-col gap-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                {eyebrow}
              </p>
            )}
            <h1 id={titleId} className="text-lg font-bold text-white">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={preventDismiss}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors shrink-0 disabled:opacity-40"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {children}
      </div>
    </dialog>
  )
}
