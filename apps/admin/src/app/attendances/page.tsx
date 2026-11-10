import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@novafit/supabase'
import { getAttendances } from '@novafit/supabase/src/queries/checkin'
import { getActivePlans } from '@novafit/supabase/src/queries/plans'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { BottomNav } from '@/components/BottomNav'
import { AttendanceView } from './AttendanceView'

export default async function AttendancesPage() {
  const todayStr = getTodayYYYYMMDD() // YYYY-MM-DD (Nicaragua)

  const supabase = await createClient()
  const supabaseAdmin = createServiceClient()
  
  const staff = await getCurrentStaff(supabase)
  if (!staff) {
    redirect('/login')
  }

  const initialAttendances = await getAttendances(supabaseAdmin, {
    startDate: todayStr,
    endDate: todayStr,
  })

  const plans = await getActivePlans(supabase)

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registro de Visitas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Historial de asistencias
            </p>
          </div>
        </div>
      </header>

      <main className="page-content mt-6">
        <AttendanceView 
          initialAttendances={initialAttendances} 
          plans={plans} 
          todayStr={todayStr} 
        />
      </main>
      
      <BottomNav currentPath="/attendances" />
    </div>
  )
}
