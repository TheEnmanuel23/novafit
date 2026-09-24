import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMembers, getCurrentStaff, hasRole } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'
import { SearchInput } from '@/components/SearchInput'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MembersPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined

  const supabase = await createClient()
  
  // RBAC Check
  const staff = await getCurrentStaff(supabase)
  if (!staff || !(await hasRole(staff, 'manage_members'))) {
    redirect('/dashboard')
  }

  const { members, total } = await getMembers(supabase, { limit: 50, search })

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
          <SearchInput placeholder="Buscar por nombre, ID o teléfono..." />
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
      
      <BottomNav currentPath="/members" />
    </div>
  )
}

function StatusBadge({ status }: { status: any }) {
  if (status === 'active') return <span className="badge badge-active">Activo</span>
  if (status === 'low_balance') return <span className="badge badge-warning">Por expirar</span>
  if (status === 'expired') return <span className="badge badge-expired">Expirado</span>
  return <span className="badge badge-no-plan">Sin Plan</span>
}
