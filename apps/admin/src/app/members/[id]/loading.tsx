export default function Loading() {
  return (
    <div className="app-container h-full flex flex-col">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <div className="w-10 h-10 rounded-full bg-surface animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-48 bg-surface rounded animate-pulse" />
          <div className="h-4 w-24 bg-surface rounded animate-pulse" />
        </div>
      </header>

      <main className="page-content mt-6 flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          Obteniendo detalles del miembro...
        </p>
      </main>
    </div>
  )
}
