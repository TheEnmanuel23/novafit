'use client'

import { useActionState, useState, useRef } from 'react'
import { updateBusinessSettings } from '@/app/actions/settings'

export function BusinessSettingsForm({ initialData }: { initialData: any }) {
  const [state, formAction, pending] = useActionState(updateBusinessSettings, null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.logo_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-medium">
          {state.error}
        </div>
      )}
      
      {state?.success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl text-sm font-medium">
          Información actualizada correctamente.
        </div>
      )}

      <input type="hidden" name="existingLogo" value={initialData?.logo_url || ''} />

      <div className="input-group">
        <label className="input-label">Logo de la Empresa</label>
        <div className="flex items-center gap-4">
          <div 
            className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button 
              type="button" 
              className="btn btn-ghost h-9 text-xs px-3 rounded-lg"
              onClick={() => fileInputRef.current?.click()}
            >
              Cambiar Imagen
            </button>
            <span className="text-xs text-muted-foreground">PNG, JPG (Max. 5MB)</span>
          </div>
          <input 
            type="file" 
            name="logo" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageChange}
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="name">Nombre de la Empresa</label>
        <input 
          id="name"
          name="name"
          type="text" 
          defaultValue={initialData?.name || ''}
          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
          required 
        />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="phone">Teléfono</label>
        <input 
          id="phone"
          name="phone"
          type="tel" 
          defaultValue={initialData?.phone || ''}
          className="input bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl" 
        />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="address">Dirección</label>
        <textarea 
          id="address"
          name="address"
          defaultValue={initialData?.address || ''}
          className="input min-h-[100px] py-3 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 rounded-xl resize-none" 
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button 
          type="submit" 
          disabled={pending}
          className="btn flex-1 h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all"
        >
          {pending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <a 
          href="/dashboard"
          className="btn flex-1 h-12 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white flex items-center justify-center"
        >
          Volver
        </a>
      </div>
    </form>
  )
}
