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

export type GetSummaryParams = {
  ticker: string
  technical: TechnicalAnalysis
  broker: BrokerAnalysis
  fundamental: FundamentalAnalysis
  news: NewsAnalysis
}

export type AnalysisResult = StockLatestPriceDate & BrokerAnalysis & FundamentalAnalysis & NewsAnalysis & TechnicalAnalysis & SummaryAnalysis & {
  ticker: string
  name: string
}

export type CacheDriver = 'memory' | 'redis'