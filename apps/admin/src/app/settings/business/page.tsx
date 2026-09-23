import { getBusinessSettings } from '@/app/actions/settings'
import { BusinessSettingsForm } from './BusinessSettingsForm'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole, isGlobalAdmin } from '@novafit/supabase'
import { redirect } from 'next/navigation'

export default async function BusinessSettingsPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff(supabase)
  
  const isGlobal = staff ? await isGlobalAdmin(staff) : false
  const canManageSettings = staff ? (await hasRole(staff, 'manage_settings')) || isGlobal : false

  if (!canManageSettings) {
    redirect('/dashboard')
  }

  const settings = await getBusinessSettings()

  return (
    <div className="app-container pb-20">
      <header className="page-header flex flex-col items-start gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Info de Empresa</h1>
        <p className="text-muted-foreground text-sm">
          Actualiza los datos y el logotipo de tu negocio.
        </p>
      </header>

      <main className="page-content mt-6">
        <div className="glass p-6">
          <BusinessSettingsForm initialData={settings} />
        </div>
      </main>
    </div>
  )
}
