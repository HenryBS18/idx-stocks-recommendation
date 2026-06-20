import { Financials, FinancialTableProps } from '../types'

export default function FinancialTable({ financials }: FinancialTableProps) {
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

      {!financials || financials.length === 0 ? (
        <p>Data tidak tersedia saat ini.</p>
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
                <tr key={financial.date || rowIndex} className="hover:bg-slate-800">
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
      )
      }
    </div>
  )
}