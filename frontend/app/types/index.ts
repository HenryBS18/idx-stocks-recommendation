export type Status = "idle" | "loading" | "done" | "error"

export type AnalyzeResponse = {
  latestPrice: number
  latestDate: string
  name: string
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