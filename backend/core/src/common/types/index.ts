import { ContentListUnion, GenerateContentConfig } from '@google/genai'

export type StockDataType = 'price-historical' | 'financials' | 'balance-sheet' | 'broker-summary'

export type StockLatestPriceDate = {
  latestDate: string
  latestPrice: number
}

export type AnalysisResult = {
  latestDate: string
  latestPrice: number
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

export type GenerateContentParams = {
  contents: ContentListUnion
  config?: GenerateContentConfig
}

export type GetAnalysisParams = {
  technical: string
  broker: string
  fundamental: string
  news: string
}