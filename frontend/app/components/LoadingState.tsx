export default function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <p className="text-sm text-blue-400">
        Analyzing market data...
      </p>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex justify-between mb-4">
          <div>
            <div className="h-4 w-20 bg-slate-800 rounded mb-2"></div>
            <div className="h-3 w-32 bg-slate-800 rounded"></div>
          </div>
          <div className="h-6 w-14 bg-slate-800 rounded-full"></div>
        </div>

        <div className="mb-4">
          <div className="h-3 w-24 bg-slate-800 rounded mb-2"></div>
          <div className="h-2 w-full bg-slate-800 rounded"></div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-800 rounded"></div>
          <div className="h-3 w-5/6 bg-slate-800 rounded"></div>
          <div className="h-3 w-4/6 bg-slate-800 rounded"></div>
        </div>
      </div>
    </div>
  )
}
