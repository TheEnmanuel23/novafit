export default function BalanceLoading() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28 gap-5">
        <div className="flex justify-between items-center">
          <div className="h-8 w-36 bg-surface rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-36 bg-surface rounded-xl animate-pulse" />
          <div className="h-11 w-44 bg-surface rounded-xl animate-pulse" />
          <div className="h-11 w-64 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-surface rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

