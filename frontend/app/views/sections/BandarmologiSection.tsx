import BroksumTable from '@/app/components/BroksumTable'
import { AnalyzeResponse, Broksum, Timeframe } from '@/app/types'

export default function BandarmologiSection({ broksum, isBroksumLoading, broksumTimeframe, setBroksumTimeframe, data }: { broksum: Broksum | null, isBroksumLoading: boolean, broksumTimeframe: Timeframe, setBroksumTimeframe: (newPeriod: Timeframe) => void, data?: AnalyzeResponse }) {
  return (
    <div className="pt-8">
      <h2 className='text-xl font-semibold text-white mb-4'>Bandarmologi</h2>
      <div className="mb-4">
        <BroksumTable broksum={broksum} isLoading={isBroksumLoading} activePeriod={broksumTimeframe} onPeriodChange={(newPeriod) => setBroksumTimeframe(newPeriod)} />
      </div>
      <div className="bg-sky-950/20 border-l-2 border-sky-500 p-4 rounded-r-lg mt-4">
        <p className='text-slate-300 leading-relaxed text-sm md:text-base' dangerouslySetInnerHTML={{ __html: data?.brokerSummary ?? 'Analisis bandarmologi tidak tersedia saat ini.' }} />
      </div>
    </div>
  )
}
