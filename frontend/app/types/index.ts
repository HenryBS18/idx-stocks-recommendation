export type Status = "idle" | "loading" | "done" | "error"

export type AnalyzeResponse = {
  ticker: string
  name: string
  latestPrice: number
  latestDate: string
  trend: string
  support: string[]
  resistance: string[]
  technical: string
  brokerSummary: string
  financials: string
  balanceSheet: string
  news: string
  summary: string
  recommendation: string
}

export type ErrorStateProps = {
  errorMessage: string
  handleAnalyze: () => void
}

export type StockList = {
  ticker: string
  name: string
}[]

export type OHLCVData = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type StockChartProps = {
  ticker: string
  support?: string[]
  resistance?: string[]
}

export type Broksum = {
  date: string
  broksum: string
}