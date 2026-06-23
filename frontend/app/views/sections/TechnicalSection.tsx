import StockChart from '@/app/components/StockChart'
import { AnalyzeResponse } from '@/app/types'

export default function TechnicalSection({ ticker, data }: { ticker: string, data?: AnalyzeResponse }) {
  return (
    <div className="pt-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className='text-xl font-semibold text-white'>Analisis Teknikal</h2>
      </div>

      <div className="mb-5 rounded-xl overflow-hidden border border-slate-800">
        <StockChart ticker={ticker} support={data?.support} resistance={data?.resistance} />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-y-4 gap-x-8 mb-5 bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 w-full md:w-fit">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Tren Harga
          </h3>
          <p className={`font-semibold ${data?.trend === 'Bullish' ? 'text-emerald-400' :
            data?.trend === 'Bearish' ? 'text-rose-400' :
              data?.trend === 'Sideways' ? 'text-slate-400' : 'text-slate-200'
            }`}>
            {data?.trend || 'Tren tidak tersedia saat ini.'}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Support
          </h3>
          <div className="flex flex-wrap gap-2">
            {data?.support.map((s, i) => (
              <span key={i} className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm font-mono text-slate-300 shadow-sm">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Resistance
          </h3>
          <div className="flex flex-wrap gap-2">
            {data?.resistance.map((r, i) => (
              <span key={i} className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm font-mono text-slate-300 shadow-sm">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className='text-slate-300 leading-relaxed text-sm md:text-base' dangerouslySetInnerHTML={{ __html: data?.technical ?? 'Analisis teknikal tidak tersedia saat ini.' }} />
    </div>
  )
}
