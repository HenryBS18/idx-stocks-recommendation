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