import { ErrorStateProps } from '../types'

export default function ErrorState({ errorMessage, handleAnalyze }: ErrorStateProps) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-red-500/20 p-6 text-center">
      <div className="mb-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
          ⚠️
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">
        Analisa Gagal
      </h2>

      <p className="text-sm text-slate-400 mb-6">
        {errorMessage}
      </p>

      <button
        onClick={() => handleAnalyze()}
        className="px-4 py-3 rounded-xl bg-blue-600 text-sm font-medium hover:bg-blue-500 transition-colors cursor-pointer"
      >
        Coba Lagi
      </button>
    </div>
  )
}
