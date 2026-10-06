import { BottomNav } from '@/components/BottomNav'

export default function Loading() {
  return (
    <div className="app-container">
      <header className="page-header flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface animate-pulse" />
          <div>
            <div className="h-6 w-32 bg-surface rounded animate-pulse" />
            <div className="h-4 w-24 bg-surface rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface animate-pulse" />
      </header>

      <main className="page-content mt-6 flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Cargando...</p>
      </main>

      <BottomNav currentPath="/dashboard" />
    </div>
  )
}
