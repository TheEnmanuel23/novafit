import { getBusinessSettings } from '@/app/actions/settings'
import { BusinessSettingsForm } from './BusinessSettingsForm'

export default async function BusinessSettingsPage() {
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
