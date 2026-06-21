import { BroksumTableProps } from '../types'

export default function BroksumTable({ broksum, isLoading }: BroksumTableProps) {
  return (
    <div className='mt-1'>
      <span className='text-sm text-slate-300'>Broker Summary </span>
      {!isLoading && (<span className='text-sm text-slate-300'>| {broksum?.date}</span>)}

      <div className='max-w-full overflow-x-auto border border-gray-500 rounded-lg w-fit mt-1 mb-2'>
        {isLoading ? (
          <div className='mt-2 px-3 inline-block min-w-full'>
            <table className="mx-0 text-center w-full sm:w-110">
              <thead className="border-b border-slate-600/50">
                <tr>
                  {[...Array(4)].map((_, i) => (
                    <th key={`skel-th-buy-${i}`} className={`pb-3 pr-2 ${i === 3 ? 'border-r border-slate-600/50' : ''}`}>
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
              <tbody>
                {[...Array(14)].map((_, rowIndex) => (
                  <tr key={`skel-row-${rowIndex}`}>

                    {[...Array(4)].map((_, colIndex) => (
                      <td key={`skel-td-buy-${rowIndex}-${colIndex}`} className={`pb-3 pt-2 pr-2 ${colIndex === 3 ? 'border-r border-slate-600/50' : ''}`}>
                        <div className={`h-4 bg-slate-700 rounded animate-pulse mx-auto ${colIndex === 0 ? 'w-8' : 'w-14 sm:w-16'}`}></div>
                      </td>
                    ))}

                    {[...Array(4)].map((_, colIndex) => (
                      <td key={`skel-td-sell-${rowIndex}-${colIndex}`} className="pb-3 pt-2 pl-1">
                        <div className={`h-4 bg-slate-700 rounded animate-pulse mx-auto ${colIndex === 0 ? 'w-8' : 'w-14 sm:w-16'}`}></div>
                      </td>
                    ))}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className='mt-2 px-3 inline-block min-w-full'
            dangerouslySetInnerHTML={{ __html: broksum?.broksum ?? '' }}
          />
        )}
      </div>
    </div>
  )
}