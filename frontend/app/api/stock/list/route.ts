import stockList from "@/data/stock-list.json"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(stockList)
}