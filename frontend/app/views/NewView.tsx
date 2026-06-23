"use client"

import { useEffect, useState } from "react"
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import SummaryCard from '../components/SummaryCard'
import { AnalyzeResponse, BalanceSheet, Broksum, Financials, Status, StockList, Timeframe } from '../types'
import BandarmologiSection from './sections/BandarmologiSection'
import FundamentalSection from './sections/FundamentalSection'
import NewsSection from './sections/NewsSection'
import TechnicalSection from './sections/TechnicalSection'

export default function NewView() {
  const [ticker, setTicker] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [data, setData] = useState<AnalyzeResponse>()
  const [search, setSearch] = useState("")
  const [stockList, setStockList] = useState<StockList>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const [timeframe, setTimeframe] = useState<Timeframe>("medium")
  const [broksumTimeframe, setBroksumTimeframe] = useState<Timeframe>("medium")

  const [broksum, setBroksum] = useState<Broksum | null>(null)
  const [financials, setFinancials] = useState<Financials[]>([])
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet[]>([])

  const [isBroksumLoading, setIsBroksumLoading] = useState<boolean>(false)
  const [isFundamentalLoading, setIsFundamentalLoading] = useState<boolean>(false)

  const [showFullList, setShowFullList] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)

  const handleScrollList = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      setVisibleCount((prev) => Math.min(prev + 10, stockList.length))
    }
  }

  const handleAnalyze = async (selectedTicker?: string, selectedTimeframe?: Timeframe) => {
    try {
      const finalTicker = selectedTicker || ticker
      const finalTimeframe = selectedTimeframe || timeframe

      setStatus("loading")
      setErrorMessage("")
      setData(undefined)
      setShowFullList(false)
      setShowDropdown(false)
      setSearch(finalTicker)
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
          timeframe: finalTimeframe,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatus("error")
        setErrorMessage(result.message || "Analisa saham gagal")
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
  }).slice(0, 6)

  const fetchBroksum = async (timeframe: Timeframe) => {
    setIsBroksumLoading(true)

    const response = await fetch(`/api/stock/${ticker}/broksum?timeframe=${timeframe}`)
    const result = await response.json() as Broksum
    setBroksum(result)

    setIsBroksumLoading(false)
  }

  useEffect(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setShowDropdown(false)
    })
  }, [])

  useEffect(() => {
    const fetchStockList = async () => {
      const response = await fetch("/api/stock/list")
      const result = await response.json() as StockList
      setStockList(result)
    }

    fetchStockList()
  }, [])

  useEffect(() => {
    if (ticker === '') return

    setBroksumTimeframe(timeframe)

    fetchBroksum(timeframe)
  }, [ticker, timeframe])

  useEffect(() => {
    if (ticker === '') return

    fetchBroksum(broksumTimeframe)
  }, [broksumTimeframe])

  useEffect(() => {
    if (ticker === '') return

    const fetchFundamental = async () => {
      setIsFundamentalLoading(true)

      const [financialsResponse, balanceSheetResponse] = await Promise.all([
        fetch(`/api/stock/${ticker}/financials`),
        fetch(`/api/stock/${ticker}/balance-sheet`)
      ])

      const financialsResult = await financialsResponse.json()
      const balanceSheetResult = await balanceSheetResponse.json()

      setFinancials(financialsResult)
      setBalanceSheet(balanceSheetResult)

      setIsFundamentalLoading(false)
    }

    fetchFundamental()
  }, [ticker])

  return (
    <>
      <section className="mb-4">
        <div className="flex items-center gap-2 mb-1 px-1">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-slate-400">
            Strategi Investasi
          </span>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['short', 'medium', 'long'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                if (timeframe === tf) return

                setTimeframe(tf)
                if (status === "done" && ticker) {
                  handleAnalyze(ticker, tf)
                }
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${timeframe === tf
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              {tf === 'short' ? 'Pendek (Harian)' : tf === 'medium' ? 'Menengah (Swing)' : 'Panjang (Invest)'}
            </button>
          ))}
        </div>
      </section>

      <section className="relative mb-8">
        <div className="flex items-center gap-2 mb-1 px-1">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <label htmlFor="search-stock" className="text-sm font-medium text-slate-400">
            Cari Saham
          </label>
        </div>

        <input
          id="search-stock"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowDropdown(true)
          }}
          disabled={status === 'loading'}
          placeholder="Cari BBCA atau Bank Central Asia"
          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          autoComplete="off"
        />

        {showDropdown && search && filteredStocks.length > 0 && (
          <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 overflow-hidden z-10">
            {filteredStocks.map((stock) => (
              <button
                key={stock.ticker}
                className="w-full px-4 py-3 text-left cursor-pointer hover:bg-slate-800"
                onClick={() => handleAnalyze(stock.ticker)}
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
      </section>

      {status === "idle" && (
        <div className="text-center mt-16 max-w-lg mx-auto">
          <p className="text-sm text-slate-400 mb-4">
            Coba pencarian cepat:
          </p>
          <div className="flex gap-2 justify-center flex-wrap mb-8">
            {["BBCA", "TLKM", "ASII", "BMRI", "BREN"].map((t) => (
              <button
                key={t}
                onClick={() => handleAnalyze(t)}
                className="text-sm px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-6">
            <button
              onClick={() => setShowFullList(!showFullList)}
              className="text-sm px-6 py-2.5 rounded-xl cursor-pointer bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors font-medium"
            >
              {showFullList ? "Sembunyikan Daftar Saham" : "Lihat Semua Saham IDX"}
            </button>

            {showFullList && stockList.length > 0 && (
              <div
                className="mt-4 mx-auto max-w-md h-72 overflow-y-auto bg-slate-900/50 border border-slate-700 rounded-xl text-left p-2 shadow-inner custom-scrollbar"
                onScroll={handleScrollList}
              >
                {stockList.slice(0, visibleCount).map((stock) => (
                  <button
                    key={stock.ticker}
                    onClick={() => handleAnalyze(stock.ticker)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group"
                  >
                    <span className="font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                      {stock.ticker}
                    </span>
                    <span className="text-xs text-slate-500 truncate ml-4 text-right">
                      {stock.name}
                    </span>
                  </button>
                ))}

                {visibleCount < stockList.length && (
                  <div className="text-center py-4 text-xs text-slate-500 animate-pulse">
                    Scroll ke bawah untuk memuat lebih banyak...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState errorMessage={errorMessage} handleAnalyze={handleAnalyze} />}

      {status === "done" && (
        <div className="transition-opacity duration-300 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-sm font-bold text-sky-400 uppercase tracking-widest">
              Laporan Analisis AI
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-slate-800/40 border-b border-slate-800 p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-16 lg:gap-24">

                <div className="min-w-42">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {data?.ticker}
                    </h2>
                    {data?.recommendation && (
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${data.recommendation === 'Buy'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                        {data.recommendation}
                      </span>
                    )}
                  </div>
                  <h2 className='text-slate-400 text-sm mt-1 font-medium'>{data?.name}</h2>
                </div>

                <div className='flex gap-8 sm:gap-12 text-left pt-1 md:pt-0'>
                  <div>
                    <p className='text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1'>
                      Harga Terakhir
                    </p>
                    <p className='text-white font-mono text-xl font-semibold'>
                      Rp {data?.latestPrice}
                    </p>
                  </div>
                  <div>
                    <p className='text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1'>
                      Tanggal
                    </p>
                    <p className='text-slate-300 font-mono text-base font-medium mt-0.5'>
                      {data?.latestDate}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-8 divide-y divide-slate-800/60">
              <SummaryCard summary={data?.summary} />

              {timeframe === 'short' || timeframe === 'medium' ? (
                <>
                  <TechnicalSection ticker={ticker} data={data} />
                  <BandarmologiSection broksum={broksum} broksumTimeframe={broksumTimeframe} setBroksumTimeframe={setBroksumTimeframe} isBroksumLoading={isBroksumLoading} data={data} />
                  <FundamentalSection financials={financials} balanceSheet={balanceSheet} data={data} isFundamentalLoading={isFundamentalLoading} />
                  <NewsSection data={data} />
                </>
              ) : (
                <>
                  <FundamentalSection financials={financials} balanceSheet={balanceSheet} data={data} isFundamentalLoading={isFundamentalLoading} />
                  <NewsSection data={data} />
                  <TechnicalSection ticker={ticker} data={data} />
                  <BandarmologiSection broksum={broksum} broksumTimeframe={broksumTimeframe} setBroksumTimeframe={setBroksumTimeframe} isBroksumLoading={isBroksumLoading} data={data} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}