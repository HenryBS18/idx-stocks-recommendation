import { BalanceSheet, BalanceSheetTableProps } from '../types'

export default function BalanceSheetTable({ balanceSheet, isLoading }: BalanceSheetTableProps) {
  const columns: (keyof BalanceSheet)[] = [
    "Periode",
    "Total Aset",
    "Total Liabilitas",
    "Total Ekuitas",
    "DER",
    "ROE",
    "PBV",
    "PER",
    "EPS",
    "Kas dan Setara Kas",
    "Piutang Usaha",
    "Aset Tetap Bersih",
    "Saldo Laba"
  ]

  const columnsTitle: Partial<Record<string, string>> = {
    'DER': 'Debt to Equity Ratio',
    'ROE': 'Return on Equity',
    'PBV': 'Price to Book Value',
    'PER': 'Price to Earning Ratio',
    'EPS': 'Earnings Per Share',
  }

  const getCellClass = (key: string, value: any) => {
    const val = parseFloat(value)

    if (key === 'ROE' && !isNaN(val)) return val > 15 ? 'text-emerald-400 font-bold' : 'text-slate-300'
    if (key === 'DER' && !isNaN(val)) return val > 200 ? 'text-rose-400 font-medium' : 'text-emerald-400 font-medium'
    if ((key === 'PER' || key === 'PBV') && !isNaN(val)) return 'text-sky-300 font-medium'
    return 'text-slate-300'
  }

  return (
    <div className="w-full">
      <span className='text-sm font-semibold text-slate-400'>
        Data Neraca Keuangan
      </span>

      <div className="max-w-fit overflow-x-auto border border-slate-800 rounded-xl shadow-inner bg-slate-900/50">
        {isLoading ? (
          <table className="text-sm border-collapse animate-pulse">
            <thead>
              <tr className="bg-slate-800/50">
                {columns.map((key) => (
                  <th key={key} className="px-4 py-3 text-left">
                    <div className="h-4 w-20 bg-slate-700 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-t border-slate-800">
                  {columns.map((key) => (
                    <td key={key} className="px-4 py-3">
                      <div className="h-4 w-full bg-slate-800 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : !balanceSheet || balanceSheet.length === 0 ? (
          <p className="text-sm text-slate-400">Data tidak tersedia saat ini.</p>
        ) : (
          <table className="text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800/50">
                {columns.map((key, colIndex) => (
                  <th
                    key={key}
                    className={`px-3 py-3 text-left font-semibold text-slate-300 whitespace-nowrap
                    ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}
                  `}
                  >
                    <span title={columnsTitle[key] ?? key}>{key}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {balanceSheet.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-800/80 transition-colors even:bg-slate-900/30">
                  {columns.map((key, colIndex) => (
                    <td
                      key={key}
                      className={`px-3 py-3 whitespace-nowrap 
                      ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-10 font-medium text-white shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}
                      ${getCellClass(key, row[key])}
                    `}
                    >
                      {row[key]}
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