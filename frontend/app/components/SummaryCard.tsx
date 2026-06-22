export default function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="w-full mb-6">
      <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Rangkuman Analisis
      </span>

      <div className=" p-3 rounded-xl border border-sky-900/50 bg-sky-950/20 shadow-inner relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-l-xl"></div>

        <div className="flex gap-2">
          <svg className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm sm:text-[16px] text-slate-300 leading-relaxed">{summary}</p >
        </div>
      </div>
    </div>
  )
}
