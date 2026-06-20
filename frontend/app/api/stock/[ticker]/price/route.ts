import { parseOHLCV } from '@/app/utils/parse-ohlcv'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const response = await fetch(`${process.env.DATA_API_URL}/stock/${ticker}/price-historical?timeframe=long`)

  const csv = await response.text()
  const data = parseOHLCV(csv)

  return NextResponse.json(data)
}