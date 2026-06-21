import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const searchParams = req.nextUrl.searchParams
  const timeframe = searchParams.get('timeframe') || 'medium'

  const response = await fetch(
    `${process.env.DATA_API_URL}/stock/${ticker}/broker-summary?type=raw&timeframe=${timeframe}`
  )
  const data = await response.json()

  return NextResponse.json(data)
}