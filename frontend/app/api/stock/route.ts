import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ticker = body.ticker

    const response = await fetch(
      `${process.env.API_URL}/stock/${ticker}`
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        data,
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: 500,
        }
      )
    }
  }
}