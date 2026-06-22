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
  "Periode": string
  "NPM": string
  "OPM": string
  "Total Pendapatan": string
  "Laba Operasional": string
  "EBITDA": string
  "Laba Bersih": string
  "Laba Sebelum Pajak": string
  "Beban Operasional": string
  "Beban Bunga": string
  "Pendapatan Bunga": string
  "EPS": string
  "PER": string
  "ROE": string
  "ROA": string
}

export type BalanceSheet = {
  "Periode": string
  "PBV": string
  "DER": string
  "Total Aset": string
  "Total Liabilitas": string
  "Total Ekuitas": string
  "Kas dan Setara Kas": string
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

export type Timeframe = "short" | "medium" | "long" | "month" | "year" | "ytd"

export type BroksumTableProps = {
  broksum: Broksum | null
  isLoading: boolean
  activePeriod: Timeframe
  onPeriodChange: (period: Timeframe) => void
}


export type UIMode = 'Lama' | 'Baru'