import { AnalyzeResponse } from '@/app/types'
import Link from 'next/link'

export default function NewsSection({ data }: { data?: AnalyzeResponse }) {
  return (
    <div className="pt-8">
      <h2 className='text-xl font-semibold text-white mb-4'>Sentimen Berita Utama</h2>

      <p className='text-slate-300 leading-relaxed md:text-base mb-4' dangerouslySetInnerHTML={{ __html: data?.news.text ?? 'Analisis berita tidak tersedia saat ini.' }} />

      <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
        <p className='text-slate-400 text-xs font-bold mb-2'>Tautan Sumber Berita</p>
        <ul className="space-y-2">
          {data?.news.sources.length !== 0 ? data?.news.sources.map((source, i) => (
            <li key={i} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <Link className='text-sky-400 hover:text-sky-300 transition-colors text-sm truncate' href={source} target='_blank'>
                {source}
              </Link>
            </li>
          )) : (
            <p className='text-sm text-slate-500 italic'>Sumber tidak tersedia saat ini.</p>
          )}
        </ul>
      </div>
    </div>
  )
}
