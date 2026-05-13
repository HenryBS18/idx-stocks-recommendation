import csvParser from 'csv-parser'
import fs from 'fs'

export type StockLatestPriceDate = {
  latestDate: string
  latestPrice: number
}

export const getStockLatestPriceDate = (filePath: string): Promise<StockLatestPriceDate> => {
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