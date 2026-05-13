"use client"

import { useState } from "react"
import { AnalyzeResponse, Status } from './types'

export default function Home() {
  const [ticker, setTicker] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [data, setData] = useState<AnalyzeResponse>()

  const handleAnalyze = async (selectedTicker?: string) => {
    try {
      const finalTicker = selectedTicker || ticker

      if (!finalTicker) return

      setStatus("loading")
      setErrorMessage("")
      setData(undefined)
      setTicker(finalTicker)

      const response = await fetch(`/api/stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: finalTicker,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatus("error")
        setErrorMessage(result.message || "Failed to analyze stock")
        return
      }

      setData(result)

      setStatus("done")
    } catch (error) {
      setStatus("error")

      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage("Something went wrong")
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-6 mx-auto">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">
          IDX Stocks Recommendation
        </h1>
        <p className="text-sm text-slate-400">
          AI-Powered Indonesian Stocks Analyzer
        </p>
      </header>

      <section className="mb-6">
        <div className="flex gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="BBCA, TLKM..."
            maxLength={4}
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={status === "loading"}
            className="px-4 py-3 rounded-xl bg-blue-600 text-sm font-medium cursor-pointer hover:bg-blue-500 disabled:opacity-50"
          >
            {status === "loading" ? "..." : "Analyze"}
          </button>
        </div>
      </section>

      {status === "idle" && (
        <div className="text-center mt-16">
          <p className="text-sm text-slate-400 mb-4">
            Try Searching:
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {["BBCA", "TLKM", "ASII"].map((t) => (
              <button
                key={t}
                onClick={() => handleAnalyze(t)}
                className="text-xs px-3 py-1 rounded-full bg-slate-800 cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-4 animate-pulse">
          <p className="text-sm text-blue-400">
            Analyzing market data...
          </p>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="flex justify-between mb-4">
              <div>
                <div className="h-4 w-20 bg-slate-800 rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-800 rounded"></div>
              </div>
              <div className="h-6 w-14 bg-slate-800 rounded-full"></div>
            </div>

            <div className="mb-4">
              <div className="h-3 w-24 bg-slate-800 rounded mb-2"></div>
              <div className="h-2 w-full bg-slate-800 rounded"></div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-800 rounded"></div>
              <div className="h-3 w-5/6 bg-slate-800 rounded"></div>
              <div className="h-3 w-4/6 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl bg-slate-900 border border-red-500/20 p-6 text-center">
          <div className="mb-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
              ⚠️
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-2">
            Failed to Analyze
          </h2>

          <p className="text-sm text-slate-400 mb-6">
            {errorMessage}
          </p>

          <button
            onClick={() => handleAnalyze()}
            className="px-4 py-3 rounded-xl bg-blue-600 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="space-y-4 transition-opacity duration-300">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {ticker}
              </h2>

              <span className={`text-lg px-4 py-2 rounded-full ${data?.recommendation === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {data?.recommendation}
              </span>
            </div>

            <div className='flex space-x-6 mb-3'>
              <div>
                <h2>Harga Terakhir</h2>
                <p className='text-slate-300 text-xl'>Rp {data?.latestPrice}</p>
              </div>

              <div>
                <h2>Tanggal</h2>
                <p className='text-slate-300 text-xl'>{data?.latestDate}</p>
              </div>
            </div>

            <div className="mb-3 space-y-2">
              <h2 className='text-xl'>Teknikal</h2>

              <div>
                <h3>Tren Harga</h3>

                <p className='text-slate-300'>{data?.trend}</p>
              </div>

              <div className='flex gap-x-6'>
                <div>
                  <h3>Support</h3>

                  <ul className="text-sm text-slate-300 space-y-1">
                    {
                      data?.support.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))
                    }
                  </ul>
                </div>

                <div>
                  <h3>Resistance</h3>

                  <ul className="text-sm text-slate-300 space-y-1">
                    {
                      data?.resistance.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))
                    }
                  </ul>
                </div>
              </div>

              <p className='text-slate-300'>{data?.technical}</p>
            </div>

            <div className="mb-3">
              <h2 className='text-xl'>Broker Summary</h2>

              <p className='text-slate-300'>{data?.brokerSummary}</p>
            </div>

            <div className="mb-3">
              <h2 className='text-xl'>Fundamental</h2>

              <div className='space-y-1'>
                <p className='text-slate-300'>{data?.financials}</p>
                <p className='text-slate-300'>{data?.balanceSheet}</p>
              </div>
            </div>

            <div className="mb-3">
              <h2 className='text-xl'>Berita</h2>

              <p className='text-slate-300'>{data?.news}</p>
            </div>

            <div className="mb-3">
              <h2 className='text-xl'>Kesimpulan</h2>

              <p className='text-slate-300'>{data?.summary}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}