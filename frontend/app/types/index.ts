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
  news: {
    text: string
    sources: string[]
  }
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

export type Financials = {
  "date": string
  "NPM": string
  "OPM": string
  "Pendapatan Total": string
  "Laba Operasional": string
  "EBITDA": string
  "Laba Bersih": string
  "Laba Sebelum Pajak": string
  "Beban Operasional": string
  "Beban Bunga": string
  "Pendapatan Bunga": string
}

export type BalanceSheet = {
  "date": string
  "EPS": string
  "PER": string
  "PBV": string
  "ROE": string
  "DER": string
  "Total Aset": string
  "Kas dan Setara Kas": string
  "Piutang Usaha": string
  "Aset Tetap Bersih": string
  "Total Liabilitas": string
  "Total Ekuitas": string
  "Saldo Laba": string
}

export type FinancialTableProps = {
  financials: Financials[]
  isLoading: boolean
}

export type BalanceSheetTableProps = {
  balanceSheet: BalanceSheet[]
  isLoading: boolean
}

export type BroksumTableProps = {
  broksum: Broksum | null
  isLoading: boolean
}