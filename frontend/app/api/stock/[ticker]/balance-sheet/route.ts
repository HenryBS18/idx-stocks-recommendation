import { parseCsv } from '@/app/utils/parse-csv'
import { NextApiRequest } from 'next'
import { NextResponse } from 'next/server'

export async function GET(request: NextApiRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const response = await fetch(`${process.env.DATA_API_URL}/stock/${ticker}/balance-sheet`)
  const csv = await response.text()

  const data = parseCsv(csv)

  return NextResponse.json(data)
}