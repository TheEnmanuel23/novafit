'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

export function UserDropdown({ 
  userName = 'Usuario',
  permissions,
  hideChangePassword = false
}: { 
  userName?: string
  permissions?: {
    canManageSettings: boolean
    canManageMembers: boolean
    canAccessInventory?: boolean
    canAccessSales?: boolean
  }
  hideChangePassword?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 pr-4 rounded-full bg-surface hover:bg-surface-hover border border-white/10 transition-all hover-lift"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm uppercase">
          {userName.charAt(0)}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#12131c] p-2 rounded-xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 border border-white/10 shadow-2xl origin-top-right">
          {permissions?.canManageSettings && (
            <Link 
              href="/settings/business" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              Empresa
            </Link>
          )}
          
          {permissions?.canManageMembers && (
            <Link 
              href="/plans" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Planes
            </Link>
          )}

          {permissions?.canAccessSales && (
            <>
              <Link 
                href="/sales" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                Ventas
              </Link>
              <Link 
                href="/balance" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                Balance
              </Link>
            </>
          )}

          {permissions?.canAccessInventory && (
            <Link 
              href="/inventory" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
              Inventario
            </Link>
          )}
          
          {!hideChangePassword && (
            <Link 
              href="/update-password" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Cambiar Contraseña
            </Link>
          )}

          <div className="h-px bg-white/10 my-1 w-full" />

          <form action={signOut}>
            <button 
              type="submit" 
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Cerrar Sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
