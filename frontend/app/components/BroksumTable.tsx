'use client'

import { BroksumTableProps, Timeframe } from '../types'

export default function BroksumTable({ broksum, isLoading, activePeriod, onPeriodChange }: BroksumTableProps) {
  const period = {
    '3 Hari Terakhir': 'short',
    '1 Minggu Terakhir': 'week',
    '1 Bulan Terakhir': 'month',
    '3 Bulan Terakhir': 'medium',
    '6 Bulan Terakhir': 'long',
    '1 Tahun Terakhir': 'year',
    'Year to Date': 'ytd',
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center mb-3 gap-y-3">
        <div>
          <span className='text-sm font-medium text-slate-400'>
            Broker Summary |
          </span>
          {!isLoading ? broksum?.date && (
            <span className='text-sm font-medium text-slate-400 mx-2'>
              {broksum.date}
            </span>
          ) : (
            <div className='w-70 h-full mx-2'>
            </div>
          )}
        </div>

        <div className="relative">
          <select
            value={activePeriod}
            onChange={(e) => onPeriodChange(e.target.value as Timeframe)}
            disabled={isLoading}
            className={`appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full sm:max-w-fit px-3 py-1 pr-8 cursor-pointer transition-colors hover:border-slate-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {Object.entries(period).map(([label, value]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      <div className='max-w-full overflow-x-auto border border-slate-800 rounded-xl w-fit mb-2 bg-slate-900/50 shadow-inner'>
        {isLoading ? (
          <div className='mt-2 px-3 inline-block min-w-full'>
            <table className="mx-0 text-center w-full sm:w-110">
              <thead className="border-b border-slate-700/50">
                <tr>
                  {[...Array(4)].map((_, i) => (
                    <th key={`skel-th-buy-${i}`} className={`pb-3 pr-2 ${i === 3 ? 'border-r border-slate-700/50' : ''}`}>
                      <div className="h-3 bg-slate-700 rounded animate-pulse w-8 mx-auto"></div>
                    </th>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <th key={`skel-th-sell-${i}`} className="pb-3 pl-1">
                      <div className="h-3 bg-slate-700 rounded animate-pulse w-8 mx-auto"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[...Array(14)].map((_, rowIndex) => (
                  <tr key={`skel-row-${rowIndex}`}>
                    {[...Array(4)].map((_, colIndex) => (
                      <td key={`skel-td-buy-${rowIndex}-${colIndex}`} className={`pb-3 pt-3 pr-2 ${colIndex === 3 ? 'border-r border-slate-700/50' : ''}`}>
                        <div className={`h-4 bg-slate-800 rounded animate-pulse mx-auto ${colIndex === 0 ? 'w-8' : 'w-14 sm:w-16'}`}></div>
                      </td>
                    ))}
                    {[...Array(4)].map((_, colIndex) => (
                      <td key={`skel-td-sell-${rowIndex}-${colIndex}`} className="pb-3 pt-3 pl-1">
                        <div className={`h-4 bg-slate-800 rounded animate-pulse mx-auto ${colIndex === 0 ? 'w-8' : 'w-14 sm:w-16'}`}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className='mt-2 px-3 inline-block min-w-full text-sm text-slate-300'
            dangerouslySetInnerHTML={{ __html: broksum?.broksum ?? '<p class="py-4 text-center text-slate-500">Data tidak tersedia.</p>' }}
          />
        )}
      </div>
    </div>
  )
}