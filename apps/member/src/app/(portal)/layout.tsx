import type { ReactNode } from 'react'
import { MemberHeader } from '@/components/MemberHeader'
import { getCurrentMember } from '@/lib/member-session'

export default async function MemberPortalLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember()

  if (!member) {
    return <>{children}</>
  }

  return (
    <div className="min-h-dvh bg-gradient-radial relative overflow-x-clip">
      <a
        href="#main-content"
        className="visually-hidden fixed top-3 left-3 z-50 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <div className="app-container">
        <MemberHeader member={member} />
        <main id="main-content" className="page-content mt-6 flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  )
}

