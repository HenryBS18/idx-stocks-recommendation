import { Financials, FinancialTableProps } from '../types'

export default function FinancialTable({ financials, isLoading }: FinancialTableProps) {
  // 1. Definisikan susunan master kolom sebagai acuan dasar
  const baseColumns: (keyof Financials)[] = [
    "Periode",
    "Laba Bersih",
    "NPM",
    "Total Pendapatan",
    "Beban Operasional",
    "Laba Operasional",
    "OPM",
    "EBITDA",
    "Laba Sebelum Pajak",
    "Pendapatan Bunga",
    "Beban Bunga",
  ]

  const activeColumns = !isLoading && financials && financials.length > 0
    ? baseColumns.filter(key =>
      financials.some(row => row[key] !== undefined && row[key] !== null && row[key] !== '')
    )
    : baseColumns

  const columnsTitle: Partial<Record<string, string>> = {
    'NPM': 'Net Profit Margin',
    'OPM': 'Operating Profit Margin',
    'EBITDA': 'Earnings Before Interest, Taxes, Depreciation, and Amortization',
  }

  const getCellClass = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return 'text-slate-500'

    const val = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value

    if ((key === 'NPM' || key === 'OPM') && !isNaN(val)) return val > 10 ? 'text-emerald-400 font-medium' : val < 0 ? 'text-rose-400 font-medium' : 'text-slate-300'
    if ((key === 'Laba Bersih' || key === 'Laba Operasional') && !isNaN(val)) return val > 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'
    return 'text-slate-300'
  }

  return (
    <div className="w-full">
      <span className='text-sm font-semibold text-slate-400'>
        Data Pendapatan
      </span>

      <div className="max-w-fit overflow-x-auto border border-slate-800 rounded-xl shadow-inner bg-slate-900/50">
        {isLoading ? (
          <table className="text-sm border-collapse animate-pulse">
            <thead>
              <tr className="bg-slate-800/50">
                {activeColumns.map((key) => (
                  <th key={key} className="px-4 py-3 text-left">
                    <div className="h-4 w-20 bg-slate-700 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(9)].map((_, i) => (
                <tr key={i} className="border-t border-slate-800">
                  {activeColumns.map((key) => (
                    <td key={key} className="px-4 py-3">
                      <div className="h-4 w-full bg-slate-800 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : !financials || financials.length === 0 ? (
          <p className="text-sm text-slate-400">Data tidak tersedia saat ini.</p>
        ) : (
          <table className="text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800/50">
                {activeColumns.map((key, colIndex) => (
                  <th
                    key={key}
                    className={`px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap
                      ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}
                    `}
                  >
                    <span title={columnsTitle[key] ?? key}>{key}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {financials.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-800/80 transition-colors even:bg-slate-900/30">
                  {activeColumns.map((key, colIndex) => (
                    <td
                      key={key}
                      className={`px-4 py-3 whitespace-nowrap 
                        ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-10 font-medium text-white shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}
                        ${getCellClass(key, row[key])}
                      `}
                    >
                      {row[key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}