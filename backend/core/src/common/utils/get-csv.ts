import { StockDataType, Timeframe } from '@app/types'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export const getCsv = async (ticker: string, stockDataType: StockDataType, timeframe?: Timeframe): Promise<string> => {
  const tmpDir = join(process.cwd(), 'tmp')
  await mkdir(tmpDir, { recursive: true })

  const id = crypto.randomUUID()
  const filePath = join(tmpDir, `${ticker}_${stockDataType}_${id}.csv`)

  if (!existsSync(filePath)) {
    const stockDataApiBaseUrl = process.env.STOCK_DATA_API_URL

    const timeframeQuery = (stockDataType === 'price-historical' || stockDataType === 'broker-summary') ? `?timeframe=${timeframe}` : ''
    const response = await fetch(`${stockDataApiBaseUrl}/stock/${ticker}/${stockDataType}${timeframeQuery}`)

    if (!response.ok) {
      const message = (await response.json()).message

      if (message === 'Data belum tersedia') return message

      throw new Error(`Failed to fetch ${stockDataType}`)
    }

    const csv = await response.text()

    await writeFile(filePath, csv, 'utf-8')
  }

  return filePath
}