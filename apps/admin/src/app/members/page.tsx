import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMembers } from '@novafit/supabase'

export default async function MembersPage() {
  const supabase = await createClient()
  const { members, total } = await getMembers(supabase, { limit: 50 })

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} registrados
          </p>
        </div>
        <Link href="/members/new" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nuevo
        </Link>
      </header>

      <main className="page-content mt-6">
        <div className="glass p-2 mb-6 flex gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" className="input pl-9 border-none bg-transparent h-10 w-full focus:ring-0 shadow-none" placeholder="Buscar por nombre o ID..." />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className="glass p-4 flex justify-between items-center hover-lift group">
              <div>
                <div className="font-semibold group-hover:text-accent transition-colors">{member.nombre}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{member.username}</div>
              </div>
              <div className="text-right">
                <StatusBadge status={member.status} />
                {member.active_plan && (
                  <div className="text-sm font-medium mt-1">
                    {member.active_plan.visits_remaining} <span className="text-muted-foreground text-xs font-normal">visitas</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
          
          {members.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No hay miembros registrados aún.
            </div>
          )}
        </div>
      </main>
      
      {/* Bottom Nav Placeholder (same as Dashboard) */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Panel
        </Link>
        <Link href="/members" className="bottom-nav-item active">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Miembros
        </Link>
        <Link href="/staff" className="bottom-nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Staff
        </Link>
      </nav>
    </div>
  )
}

function StatusBadge({ status }: { status: any }) {
  if (status === 'active') return <span className="badge badge-active">Activo</span>
  if (status === 'low_balance') return <span className="badge badge-warning">Por expirar</span>
  if (status === 'expired') return <span className="badge badge-expired">Expirado</span>
  return <span className="badge badge-no-plan">Sin Plan</span>
}
