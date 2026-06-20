import { parseOHLCV } from '@/app/utils/parse-ohlcv'
import { NextApiRequest } from 'next'
import { NextResponse } from 'next/server'

export async function GET(request: NextApiRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const response = await fetch(`${process.env.DATA_API_URL}/stock/${ticker}/price-historical?timeframe=long`)

  const csv = await response.text()
  const data = parseOHLCV(csv)

  return NextResponse.json(data)
}