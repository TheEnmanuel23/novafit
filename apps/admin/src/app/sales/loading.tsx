export default function SalesLoading() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-32 gap-5">
        <div className="flex justify-between items-center">
          <div className="h-8 w-36 bg-surface rounded-lg animate-pulse" />
          <div className="h-10 w-56 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="h-11 w-full max-w-md bg-surface rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-44 bg-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

