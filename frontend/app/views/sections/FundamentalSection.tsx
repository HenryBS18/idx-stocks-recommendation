import BalanceSheetTable from '@/app/components/BalanceSheetTable'
import FinancialTable from '@/app/components/FinancialsTable'
import { AnalyzeResponse, BalanceSheet, Financials } from '@/app/types'

export default function FundamentalSection({ financials, balanceSheet, isFundamentalLoading, data }: { financials: Financials[], balanceSheet: BalanceSheet[], isFundamentalLoading: boolean, data?: AnalyzeResponse }) {
  return (
    <div className="pt-8">
      <h2 className='text-xl font-semibold text-white mb-4'>Kinerja Fundamental</h2>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='space-y-4'>
          <FinancialTable financials={financials} isLoading={isFundamentalLoading} />
          <p className='text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-lg border border-slate-800/50' dangerouslySetInnerHTML={{ __html: data?.financials ?? 'Analisis pendapatan tidak tersedia saat ini.' }} />
        </div>

        <div className='space-y-4'>
          <BalanceSheetTable balanceSheet={balanceSheet} isLoading={isFundamentalLoading} />
          <p className='text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-lg border border-slate-800/50' dangerouslySetInnerHTML={{ __html: data?.balanceSheet ?? 'Analisis neraca keuangan tidak tersedia saat ini.' }} />
        </div>
      </div>
    </div>
  )
}
