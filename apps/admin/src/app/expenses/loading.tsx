export default function ExpensesLoading() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 pt-5 pb-28 gap-5 animate-pulse">
        <div className="h-12 w-48 rounded-xl bg-surface" />
        <div className="h-12 w-full rounded-xl bg-surface" />
        <div className="h-96 w-full rounded-2xl bg-surface" />
      </div>
    </div>
  )
}

