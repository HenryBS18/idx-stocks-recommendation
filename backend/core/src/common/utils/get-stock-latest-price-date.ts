import { StockLatestPriceDate } from '@app/types'
import csvParser from 'csv-parser'
import fs from 'fs'
import { getCsv } from './get-csv'

export const getStockLatestPriceDate = async (ticker: string): Promise<StockLatestPriceDate> => {
  const filePath = await getCsv(ticker, 'price-historical')

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath).pipe(csvParser())

    stream.on('data', (data) => {
      stream.destroy()

      resolve({
        latestDate: data.date,
        latestPrice: Number(data.close),
      })
    }).on('error', reject)
  })
}