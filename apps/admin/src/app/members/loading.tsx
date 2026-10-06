import { BottomNav } from '@/components/BottomNav'

export default function Loading() {
  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div>
          <div className="h-8 w-32 bg-surface rounded animate-pulse" />
          <div className="h-4 w-24 bg-surface rounded animate-pulse mt-2" />
        </div>
        <div className="w-24 h-10 bg-primary/20 rounded animate-pulse" />
      </header>

      <main className="page-content mt-6">
        <div className="glass p-4 mb-6 rounded-xl h-32 animate-pulse" />
        
        <div className="flex mb-4">
          <div className="w-48 h-10 bg-surface rounded animate-pulse" />
        </div>

        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass p-4 rounded-xl flex justify-between items-start h-24 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-surface rounded" />
                <div className="h-4 w-32 bg-surface rounded" />
                <div className="h-3 w-40 bg-surface rounded mt-4" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-6 w-16 bg-surface rounded-full" />
                <div className="h-4 w-20 bg-surface rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <BottomNav currentPath="/members" />
    </div>
  )
}
