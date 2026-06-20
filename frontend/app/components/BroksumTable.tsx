import { BroksumTableProps } from '../types'

export default function BroksumTable({ broksum }: BroksumTableProps) {
  return (
    <div className='mt-1'>
      <span className='text-sm text-slate-300'>Broker Summary | </span>
      <span className='text-sm text-slate-300'>{broksum.date}</span>

      <div className='max-w-full overflow-x-auto border border-gray-500 rounded-lg w-fit mt-1 mb-2'>
        <div className='mt-2 px-3 inline-block min-w-full' dangerouslySetInnerHTML={{ __html: broksum.broksum }} />
      </div>
    </div>
  )
}
