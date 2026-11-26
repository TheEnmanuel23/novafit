'use client'

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import type { MemberWithStatus } from '@novafit/types'
import { signOutMember } from '@/app/actions/auth'
import { MEMBER_NAV_ITEMS, MEMBER_STATUS_META } from '@/lib/member-navigation'
import { CheckIcon, CloseIcon, LogOutIcon, MenuIcon, NavSectionIcon, QrCodeIcon } from './Icons'
import { ModalDialog } from './ModalDialog'

function normalizePath(path: string): string {
  return path === '/' ? '/' : path.replace(/\/+$/, '')
}

export function MemberHeader({ member }: { member: MemberWithStatus }) {
  const rawPathname = usePathname()
  const pathname = normalizePath(rawPathname || '/')
  const router = useRouter()
  const drawerId = useId()
  const drawerTitleId = useId()

  const drawerRef = useRef<HTMLDialogElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const hasEnteredRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [qrState, setQrState] = useState<{ username: string; dataUrl: string } | null>(null)
  const [isSigningOut, startSignOutTransition] = useTransition()

  const statusMeta = MEMBER_STATUS_META[member.status]
  const qrDataUrl = qrState?.username === member.username ? qrState.dataUrl : ''

  const activeNavItem =
    MEMBER_NAV_ITEMS.find((item) =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    ) ?? MEMBER_NAV_ITEMS[0]

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const finalizeClose = useCallback(() => {
    clearCloseTimer()
    hasEnteredRef.current = false
    const drawer = drawerRef.current
    const scroller = scrollerRef.current
    if (scroller && scroller.scrollLeft > 0) {
      scroller.scrollTo({ left: 0, behavior: 'instant' })
    }
    if (drawer?.open) {
      drawer.close()
    }
    setIsDrawerOpen(false)
  }, [clearCloseTimer])

  const closeDrawer = useCallback(() => {
    const drawer = drawerRef.current
    const scroller = scrollerRef.current
    if (!drawer?.open || !scroller) return

    if (scroller.scrollLeft <= 2) {
      finalizeClose()
      return
    }

    clearCloseTimer()
    scroller.scrollTo({ left: 0, behavior: 'auto' })
    // Guarantee dialog closes even if smooth scroll is interrupted during route transition
    closeTimerRef.current = setTimeout(finalizeClose, 320)
  }, [clearCloseTimer, finalizeClose])

  const openDrawer = useCallback(async () => {
    const drawer = drawerRef.current
    const scroller = scrollerRef.current
    if (!drawer || !scroller) return

    clearCloseTimer()

    if (drawer.open && scroller.scrollLeft > 2) {
      return
    }

    hasEnteredRef.current = false
    if (!drawer.open) {
      drawer.showModal()
    }

    if (scroller.scrollLeft > 0 || !window.CSS?.supports?.('scroll-initial-target', 'nearest')) {
      scroller.scrollTo({ left: 0, behavior: 'instant' })
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }

    setIsDrawerOpen(true)
    scroller.scrollTo({ left: scroller.scrollWidth, behavior: 'auto' })
  }, [clearCloseTimer])

  // Ensure drawer closes cleanly whenever the active route changes
  useEffect(() => {
    const drawer = drawerRef.current
    const scroller = scrollerRef.current
    if (drawer?.open) {
      clearCloseTimer()
      hasEnteredRef.current = false
      scroller?.scrollTo({ left: 0, behavior: 'instant' })
      drawer.close()
    }
  }, [pathname, clearCloseTimer])

  // Observe drawer sheet visibility to synchronize open/closed state with native swipe-to-dismiss
  useEffect(() => {
    const drawer = drawerRef.current
    const scroller = scrollerRef.current
    const sheet = sheetRef.current
    if (!drawer || !scroller || !sheet) return

    const closedRatioThreshold = 0.02

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry || !drawer.open) return

        if (entry.intersectionRatio >= 0.15) {
          hasEnteredRef.current = true
          if (entry.intersectionRatio >= 0.95) {
            setIsDrawerOpen(true)
          }
        } else if (hasEnteredRef.current && entry.intersectionRatio <= closedRatioThreshold) {
          finalizeClose()
        }
      },
      { root: drawer, threshold: [0, closedRatioThreshold, 0.15, 0.95, 1] }
    )

    observer.observe(sheet)

    const supportsScrollTimeline = Boolean(window.CSS?.supports?.('animation-timeline: scroll()'))

    const handleScroll = () => {
      if (!drawer.open) return
      if (!supportsScrollTimeline) {
        const width = sheet.offsetWidth || 1
        const ratio = Math.min(1, Math.max(0, scroller.scrollLeft / width))
        drawer.style.setProperty('--drawer-backdrop', String(ratio))
      }
      if (hasEnteredRef.current && scroller.scrollLeft <= 2) {
        finalizeClose()
      }
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })

    const handleNativeClose = () => {
      clearCloseTimer()
      hasEnteredRef.current = false
      setIsDrawerOpen(false)
    }

    const handleCancel = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault()
        closeDrawer()
      }
    }

    drawer.addEventListener('close', handleNativeClose)
    drawer.addEventListener('cancel', handleCancel)

    return () => {
      clearCloseTimer()
      observer.disconnect()
      scroller.removeEventListener('scroll', handleScroll)
      drawer.removeEventListener('close', handleNativeClose)
      drawer.removeEventListener('cancel', handleCancel)
    }
  }, [clearCloseTimer, closeDrawer, finalizeClose])

  // Generate QR code lazily when requested and cache per username
  useEffect(() => {
    if (!isQrOpen || !member.username || qrDataUrl) return

    let cancelled = false
    QRCode.toDataURL(member.username, {
      width: 280,
      margin: 2,
      color: { dark: '#0a0b0f', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrState({ username: member.username, dataUrl })
        }
      })
      .catch((err) => console.error('[MemberHeader] Failed to generate QR code:', err))

    return () => {
      cancelled = true
    }
  }, [isQrOpen, member.username, qrDataUrl])

  const handleNavItemClick = (targetHref: string) => {
    if (pathname === targetHref) {
      closeDrawer()
      return
    }
    // Close modal immediately before route transition so focus/scroll-snap cannot cancel navigation or snap back open
    finalizeClose()
  }

  const handleOpenQrFromDrawer = () => {
    finalizeClose()
    setIsQrOpen(true)
  }

  const handleCloseQr = useCallback(() => {
    setIsQrOpen(false)
    // Refresh server data in case reception just scanned the member's QR pass
    router.refresh()
  }, [router])

  const handleLogout = () => {
    startSignOutTransition(async () => {
      finalizeClose()
      await signOutMember()
      router.replace('/')
      router.refresh()
    })
  }

  return (
    <>
      <header className="page-header items-center gap-3 border-b border-border pb-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-lg overflow-hidden shrink-0">
            <Image
              src="/novafit-logo.jpg"
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <span className="block text-lg font-black tracking-tight text-white leading-tight">
              NovaFit
            </span>
            <span className="block text-[11px] font-semibold text-accent truncate">
              {activeNavItem.label}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="btn btn-primary min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] active:scale-95 transition-transform"
          >
            <QrCodeIcon size={16} />
            Mi QR
          </button>

          <button
            type="button"
            onClick={openDrawer}
            aria-label="Menú"
            aria-expanded={isDrawerOpen}
            aria-controls={drawerId}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-hover border border-white/10 text-white transition-colors shadow-sm active:scale-95"
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </header>

      {/* Native Top-Layer Swipeable Navigation Drawer */}
      <dialog
        ref={drawerRef}
        id={drawerId}
        aria-labelledby={drawerTitleId}
        className="nav-drawer"
        onClick={(event) => {
          if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
            closeDrawer()
          }
        }}
      >
        <div ref={scrollerRef} className="nav-drawer-scroller">
          <nav ref={sheetRef} aria-label="Principal" className="nav-drawer-sheet">
            {/* Drawer Header */}
            <div className="flex flex-col gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    aria-hidden="true"
                    className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-bold text-sm uppercase shrink-0"
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 id={drawerTitleId} className="text-sm font-bold text-white truncate">
                      {member.name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-mono">{member.username}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Cerrar menú"
                  autoFocus
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors shrink-0"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Estado del miembro</span>
                <span className={`${statusMeta.badgeClass} text-[10px] uppercase tracking-wider`}>
                  {statusMeta.label}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="py-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                Secciones
              </p>
              <ul role="list" className="flex flex-col gap-2 list-none">
                {MEMBER_NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                  const descriptionText =
                    item.href === '/' && member.active_plan
                      ? `${member.active_plan.visits_remaining} días disponibles`
                      : item.description

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => handleNavItemClick(item.href)}
                        className={`relative w-full p-3 rounded-xl flex items-center justify-between gap-2 text-left transition-colors border ${
                          isActive
                            ? 'bg-accent/20 border-accent text-white shadow-[0_0_20px_-6px_rgba(99,102,241,0.55)]'
                            : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/75 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'bg-accent text-white shadow-sm'
                                : 'bg-white/10 text-muted-foreground'
                            }`}
                          >
                            <NavSectionIcon icon={item.icon} size={18} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs truncate ${
                                isActive ? 'font-bold text-white' : 'font-medium text-white/85'
                              }`}
                            >
                              {item.label}
                            </p>
                            <p
                              className={`text-[11px] truncate ${
                                isActive ? 'text-white/80' : 'text-muted-foreground'
                              }`}
                            >
                              {descriptionText}
                            </p>
                          </div>
                        </div>

                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                            <CheckIcon size={12} />
                            Actual
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Drawer Footer Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleOpenQrFromDrawer}
                className="w-full btn btn-primary min-h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <QrCodeIcon size={16} />
                Mostrar Mi QR
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="w-full btn btn-ghost min-h-11 rounded-xl text-xs font-semibold text-error hover:bg-error/10 hover:text-error flex items-center justify-center gap-2 border-error/20"
              >
                <LogOutIcon size={16} />
                {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>
          </nav>
        </div>
      </dialog>

      {/* QR Check-In Pass Modal */}
      <ModalDialog
        open={isQrOpen}
        onClose={handleCloseQr}
        title="Pase de Acceso QR"
        subtitle="Muestra este código al escáner en recepción"
        maxWidth="24rem"
      >
        <div className="flex flex-col items-center text-center gap-5">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`Código QR de ingreso para el usuario ${member.username}`}
                width={240}
                height={240}
                unoptimized
                className="w-60 h-60 object-contain rounded-lg"
              />
            ) : (
              <div className="w-60 h-60 flex items-center justify-center">
                <div className="spinner" role="progressbar" aria-label="Generando código QR" />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">ID de Usuario</p>
            <p className="text-2xl font-black font-mono text-accent tracking-wider mt-0.5">
              {member.username}
            </p>
            <p className="text-sm font-medium text-white/90 mt-1">{member.name}</p>
          </div>

          <button
            type="button"
            onClick={handleCloseQr}
            className="btn btn-primary w-full min-h-12 rounded-2xl text-sm font-bold"
          >
            Listo
          </button>
        </div>
      </ModalDialog>
    </>
  )
}
