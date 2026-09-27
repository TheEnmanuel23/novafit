'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import type { Member } from '@novafit/types'

type ShareMemberAppModalProps = {
  member: Member
}

export function ShareMemberAppModal({ member }: ShareMemberAppModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Use the member app URL, or fallback to localhost during dev
  const memberAppUrl = process.env.NEXT_PUBLIC_MEMBER_APP_URL || 'http://localhost:3001'
  
  // Construct the URL with query parameters
  const registerUrl = new URL('/register', memberAppUrl)
  registerUrl.searchParams.set('id', member.username)
  registerUrl.searchParams.set('name', member.name)
  if (member.phone) {
    registerUrl.searchParams.set('phone', member.phone)
  }

  const urlString = registerUrl.toString()

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(urlString, { 
        width: 250,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#00000000'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err))
    }
  }, [isOpen, urlString])

  const copyToClipboard = async () => {
    const textToCopy = `¡Hola ${member.name}! 👋\n\nEste es tu enlace para registrarte en la aplicación de miembros de NovaFit:\n\n${urlString}\n\nTu ID de usuario es: ${member.username}\n\nPor favor, ingresa al enlace para crear tu contraseña.`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary h-10 px-4 rounded-xl flex items-center gap-2"
        title="Compartir App de Miembro"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
        <span className="hidden sm:inline">Compartir App</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-white/10 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <header className="p-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-surface/80 backdrop-blur z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold">App de Miembro</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </header>

            <div className="p-6 overflow-y-auto flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">ID de Usuario</p>
                <p className="text-lg font-bold text-accent">{member.username}</p>
              </div>

              {qrDataUrl && (
                <div className="bg-black/40 p-4 rounded-2xl border border-white/10 shadow-inner flex flex-col items-center justify-center">
                  <img src={qrDataUrl} alt="QR Code for App" className="w-48 h-48 rounded-lg" />
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    El cliente puede escanear esto con su cámara
                  </p>
                </div>
              )}

              <div className="w-full">
                <p className="text-sm font-semibold mb-2">Mensaje para WhatsApp:</p>
                <div className="bg-black/40 p-3 rounded-lg border border-white/10 text-xs text-muted-foreground font-mono break-words whitespace-pre-wrap">
                  ¡Hola {member.name}! 👋{'\n\n'}
                  Este es tu enlace para registrarte en la aplicación de miembros de NovaFit:{'\n\n'}
                  <span className="text-accent break-all">{urlString}</span>{'\n\n'}
                  Tu ID de usuario es: {member.username}{'\n\n'}
                  Por favor, ingresa al enlace para crear tu contraseña.
                </div>
              </div>

              <button 
                onClick={copyToClipboard}
                className="w-full btn btn-primary py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Copiar para WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
