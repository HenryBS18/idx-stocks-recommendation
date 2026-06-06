import { StockDataType } from '@app/types'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export const getCsv = async (ticker: string, stockDataType: StockDataType): Promise<string> => {
  const tmpDir = join(process.cwd(), 'tmp')
  await mkdir(tmpDir, { recursive: true })

  const id = crypto.randomUUID()
  const filePath = join(tmpDir, `${ticker}_${stockDataType}_${id}.csv`)

  if (!existsSync(filePath)) {
    const stockDataApiBaseUrl = process.env.STOCK_DATA_API_URL
    const response = await fetch(`${stockDataApiBaseUrl}/stock/${ticker}/${stockDataType}`)

    if (!response.ok) throw new Error(`Failed to fetch ${stockDataType}`)

    const csv = await response.text()

    await writeFile(filePath, csv, 'utf-8')
  }

  return filePath
}