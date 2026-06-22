"use client"

import { useState } from "react"
import { UIMode } from './types'
import NewView from './views/NewView'
import OldView from './views/OldView'

export default function Home() {
  const [uiMode, setUiMode] = useState<UIMode>('Baru')

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-6 mx-auto">
      <header className="mb-4 flex items-center justify-between">
        <a href='/' className="inline-block w-fit group">
          <h1 className="text-lg font-semibold group-hover:text-blue-400 transition-colors duration-300">
            IDX Stocks Recommendation
          </h1>
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
            AI-Powered Indonesian Stocks Analyzer
          </p>
        </a>

        <div className='flex flex-col sm:flex-row gap-x-2 gap-y-1 sm:gap-y-0 sm:items-center'>
          <span className='text-slate-400 text-xs sm:text-sm'>UI Mode</span>

          <div className="relative">
            <select
              value={uiMode}
              onChange={(e) => setUiMode(e.target.value as UIMode)}
              className={'appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-xs sm:text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full sm:max-w-fit px-3 py-1 pr-8 cursor-pointer transition-colors hover:border-slate-500'}
            >
              {['Lama', 'Baru'].map((label) => (
                <option key={label} value={label}>
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
      </header>

      {uiMode === 'Lama' ? (
        <OldView />
      ) : (
        <NewView />
      )}
    </main>
  )
}