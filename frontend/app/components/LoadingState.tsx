export default function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse transition-opacity duration-300">

      <div className="flex items-center gap-2 mb-2 px-1">
        <svg className="w-4 h-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Menganalisis Data Pasar...
        </h2>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">

        <div className="flex items-center justify-between sm:justify-normal sm:gap-x-20 mb-3">
          <div>
            <div className="h-8 w-24 bg-slate-800 rounded-lg mb-2"></div>
            <div className="h-4 w-48 bg-slate-800 rounded"></div>
          </div>
          <div className="h-10 w-24 bg-slate-800 rounded-full"></div>
        </div>

        <div className="flex space-x-6 mb-6">
          <div>
            <div className="h-5 w-24 bg-slate-800 rounded mb-2"></div>
            <div className="h-7 w-32 bg-slate-800 rounded"></div>
          </div>
          <div>
            <div className="h-5 w-20 bg-slate-800 rounded mb-2"></div>
            <div className="h-7 w-32 bg-slate-800 rounded"></div>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="h-6 w-24 bg-slate-800 rounded-md"></div>

          <div className="w-full h-64 bg-slate-800/50 rounded-xl border border-slate-800"></div>

          <div>
            <div className="h-5 w-28 bg-slate-800 rounded mb-2"></div>
            <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
          </div>

          <div className="flex gap-x-6">
            <div className="w-32">
              <div className="h-5 w-20 bg-slate-800 rounded mb-2"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-800 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
              </div>
            </div>
            <div className="w-32">
              <div className="h-5 w-24 bg-slate-800 rounded mb-2"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-800 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="h-6 w-36 bg-slate-800 rounded-md mb-4"></div>

          <div className="w-full h-48 bg-slate-800/50 rounded-xl border border-slate-800"></div>

          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-4/5 bg-slate-800 rounded"></div>
          </div>
        </div>

        <div className="mb-6 space-y-6">
          <div className="h-6 w-36 bg-slate-800 rounded-md"></div>

          <div className="space-y-3">
            <div className="w-full h-40 bg-slate-800/50 rounded-xl border border-slate-800"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-800 rounded"></div>
              <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-full h-40 bg-slate-800/50 rounded-xl border border-slate-800"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-800 rounded"></div>
              <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="h-6 w-20 bg-slate-800 rounded-md"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
          </div>

          <div className="h-4 w-16 bg-slate-800 rounded mt-4"></div>
          <div className="space-y-2 mt-2">
            <div className="h-4 w-48 bg-slate-800 rounded"></div>
            <div className="h-4 w-56 bg-slate-800 rounded"></div>
          </div>
        </div>

        <div className="mb-3 space-y-3">
          <div className="h-6 w-32 bg-slate-800 rounded-md mb-2"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-4/5 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}