import { Financials, FinancialTableProps } from '../types'

export default function FinancialTable({ financials, isLoading }: FinancialTableProps) {
  const columns: (keyof Financials)[] = [
    "date",
    "Laba Bersih",
    "Pendapatan Total",
    "Beban Operasional",
    "Laba Operasional",
    "EBITDA",
    "Laba Sebelum Pajak",
    "Pendapatan Bunga",
    "Beban Bunga",
    "NPM",
    "OPM",
  ]

  return (
    <div className="max-w-fit">
      <span className='text-sm text-slate-300'>Data Pendapatan</span>

      {isLoading ? (
        <div className="max-w-full overflow-x-auto border border-gray-500 rounded-lg pt-2 mt-1">
          <table>
            <thead>
              <tr>
                {columns.map((key, colIndex) => (
                  <th
                    key={`skel-th-${key}`}
                    className={`px-3 py-2 text-left ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-10' : ''}`}
                  >
                    <div className="h-4 bg-slate-600 rounded animate-pulse w-24"></div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {[...Array(4)].map((_, rowIndex) => (
                <tr key={`skel-row-${rowIndex}`} className="border-t border-slate-700/50">
                  {columns.map((key, colIndex) => (
                    <td
                      key={`skel-td-${key}-${rowIndex}`}
                      className={`px-3 py-3 ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-10' : ''}`}
                    >
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-full min-w-20"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !financials || financials.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Data tidak tersedia saat ini.</p>
      ) : (
        <div className="max-w-full overflow-x-auto border border-gray-500 rounded-lg pt-2 mt-1">
          <table>
            <thead>
              <tr>
                {columns.map((key, colIndex) => (
                  <th key={key} className={`px-3 py-2 text-left text-xs sm:text-sm font-semibold text-slate-400 text-nowrap ${colIndex === 0 ? 'sticky left-0 bg-slate-900 z-10' : ''}`}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {financials.map((financial, rowIndex) => (
                <tr key={financial.date || rowIndex} className="hover:bg-slate-800 border-t border-slate-700/50">
                  {columns.map((key, colIndex) => (
                    <td key={key} className={`px-3 py-2 text-xs sm:text-sm text-left text-slate-300 ${colIndex === 0 ? 'sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-10' : ''}`}>
                      {financial[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}