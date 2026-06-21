import { ContentListUnion, GenerateContentConfig } from '@google/genai'

export type StockDataType = 'price-historical' | 'financials' | 'balance-sheet' | 'broker-summary'

export type StockLatestPriceDate = {
  latestDate: string
  latestPrice: number
}

export type GenerateContentParams = {
  contents: ContentListUnion
  config?: GenerateContentConfig
}

export type BrokerAnalysis = {
  brokerSummary: string
}

export type FundamentalAnalysis = {
  financials: string
  balanceSheet: string
}

export type NewsAnalysis = {
  news: string
}

export type NewsAnalysisResult = NewsAnalysis & {
  sources: string[]
}

export type TechnicalAnalysis = StockLatestPriceDate & {
  trend: string
  support: string[]
  resistance: string[]
  technical: string
}

export type SummaryAnalysis = {
  summary: string
  recommendation: string
}

export type Timeframe = 'short' | 'medium' | 'long'

export type GetSummaryParams = {
  ticker: string
  technical: TechnicalAnalysis
  broker: BrokerAnalysis
  fundamental: FundamentalAnalysis
  news: NewsAnalysis
  timeframe: Timeframe
}

export type AnalysisResult = {
  ticker: string
  name: string
  latestDate: string
  latestPrice: number
  brokerSummary: string
  financials: string
  balanceSheet: string
  news: {
    text: string
    sources: string[]
  }
  trend: string
  support: string[]
  resistance: string[]
  technical: string
  summary: string
  recommendation: string
}

export type CacheDriver = 'memory' | 'redis'