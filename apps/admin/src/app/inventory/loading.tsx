export default function InventoryLoading() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28 gap-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-40 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-surface rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-11 w-32 bg-surface rounded-xl animate-pulse" />
            <div className="h-11 w-36 bg-surface rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="h-12 w-full max-w-md bg-surface rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-9 w-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="glass p-6 h-96 animate-pulse rounded-2xl" />
      </div>
    </div>
  )
}

