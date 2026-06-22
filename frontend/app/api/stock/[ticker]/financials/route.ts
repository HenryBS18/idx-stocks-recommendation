import { parseCsv } from '@/app/utils/parse-csv'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const response = await fetch(`${process.env.DATA_API_URL}/stock/${ticker}/financials/sb`)
  const csv = await response.text()

  const data = parseCsv(csv)

  return NextResponse.json(data)
}