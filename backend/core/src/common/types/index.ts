export type StockDataType = 'price-historical' | 'financials' | 'balance-sheet' | 'broker-summary'

export type StockLatestPriceDate = {
  latestDate: string
  latestPrice: number
}