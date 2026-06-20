"use client"

import { useEffect, useState } from "react"
import ErrorState from './components/ErrorState'
import LoadingState from './components/LoadingState'
import StockChart from './components/StockChart'
import { AnalyzeResponse, Broksum, Status, StockList } from './types'

export default function Home() {
  const [ticker, setTicker] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [data, setData] = useState<AnalyzeResponse>()
  const [search, setSearch] = useState("")
  const [stockList, setStockList] = useState<StockList>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [broksum, setBroksum] = useState<Broksum | null>(null)

  const handleAnalyze = async (selectedTicker?: string) => {
    try {
      const finalTicker = selectedTicker || ticker

      setStatus("loading")
      setErrorMessage("")
      setData(undefined)
      setTicker(finalTicker)

      await new Promise(resolve => setTimeout(resolve, 200))

      if (!finalTicker) throw new Error('Kode saham tidak boleh kosong')
      if (finalTicker.length < 4) throw new Error('Kode saham harus 4 karakter')

      const response = await fetch('/api/stock', {
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
        setErrorMessage("Terjadi kesalahan di server")
      }
    }
  }

  const filteredStocks = stockList.filter((stock) => {
    const keyword = search.toLowerCase()

    return (
      stock.ticker.toLowerCase().includes(keyword) ||
      stock.name.toLowerCase().includes(keyword)
    )
  }).slice(0, 5)

  useEffect(() => {
    const fetchStockList = async () => {
      const response = await fetch("/api/stock/list")
      const result = await response.json() as StockList
      setStockList(result)
    }

    fetchStockList()
  }, [])

  useEffect(() => {
    const fetchBroksum = async () => {
      const response = await fetch(`/api/stock/${ticker}/broksum`)
      const result = await response.json() as Broksum
      setBroksum(result)
    }

    fetchBroksum()
  }, [ticker])

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
        <div className="relative">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowDropdown(true)
            }}
            placeholder="Search BBCA or Bank Central Asia"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800"
          />

          {showDropdown && search && filteredStocks.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 overflow-hidden z-10">
              {filteredStocks.map((stock) => (
                <button
                  key={stock.ticker}
                  className="w-full px-4 py-3 text-left cursor-pointer hover:bg-slate-800"
                  onClick={() => {
                    setSearch(stock.ticker)
                    setTicker(stock.ticker)
                    setShowDropdown(false)
                    handleAnalyze(stock.ticker)
                  }}
                >
                  <div className="font-medium">
                    {stock.ticker}
                  </div>

                  <div className="text-sm text-slate-400">
                    {stock.name}
                  </div>
                </button>
              ))}
            </div>
          )}
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

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState errorMessage={errorMessage} handleAnalyze={handleAnalyze} />}

      {status === "done" && (
        <div className="space-y-4 transition-opacity duration-300">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="flex items-center justify-between sm:justify-normal sm:gap-x-20">
              <div className='mb-3'>
                <h2 className="text-2xl font-semibold">
                  {data?.ticker}
                </h2>

                <h2 className='text-slate-300 text-xs'>{data?.name}</h2>
              </div>

              {data && (
                <span className={`text-lg px-4 py-2 rounded-full ${data?.recommendation === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {data?.recommendation}
                </span>
              )}
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

              <StockChart ticker={ticker} support={data?.support} resistance={data?.resistance} />

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
              <h2 className='text-xl'>Bandarmologi</h2>

              {broksum && (
                <div className='border border-gray-500 rounded-lg w-fit px-3 pt-2 mt-1 mb-2'>
                  <span className='text-sm text-slate-300'>Broker Summary | </span>
                  <span className='text-sm text-slate-300'>{broksum.date}</span>

                  <div className='w-full h-[0.5px] bg-gray-500' />
                  <div className='mt-2' dangerouslySetInnerHTML={{ __html: broksum.broksum }} />
                </div>
              )}

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