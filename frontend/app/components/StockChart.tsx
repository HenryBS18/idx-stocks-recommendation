"use client"

import { CandlestickSeries, ColorType, createChart, HistogramSeries, IChartApi } from "lightweight-charts"
import { DrawingManager, Rectangle } from "lightweight-charts-drawing"
import { useEffect, useRef, useState } from "react"
import { OHLCVData, StockChartProps } from '../types'
import { parsePriceRange } from '../utils/parse-price-range'

export default function StockChart({ ticker, support = [], resistance = [] }: StockChartProps) {
  const [data, setData] = useState<OHLCVData[]>([])

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const drawingManagerRef = useRef<any>(null)
  const activeDrawingsRef = useRef<any[]>([])

  useEffect(() => {
    const fetchPrice = async () => {
      const res = await fetch(`/api/stock/${ticker}/price`)
      const result = await res.json() as OHLCVData[]
      setData(result)
    }

    fetchPrice()
  }, [ticker])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc'
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: '#758696', labelBackgroundColor: '#758696' },
        horzLine: { color: '#758696', labelBackgroundColor: '#758696' },
      },
    })

    chartRef.current = chart

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    candlestickSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.3 },
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume-scale',
    })

    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    const drawingManager = new DrawingManager()
    drawingManager.attach(chart, candlestickSeries, chartContainerRef.current)
    drawingManagerRef.current = drawingManager

    return () => {
      chart.remove()
      chartRef.current = null
      drawingManagerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !volumeSeriesRef.current || !drawingManagerRef.current) return
    if (data.length === 0) return

    chartRef.current.priceScale('volume-scale').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
    })

    const candleData = data.map(item => ({
      time: item.time, open: item.open, high: item.high, low: item.low, close: item.close,
    }))

    const volumeData = data.map(item => ({
      time: item.time, value: item.volume,
      color: item.close >= item.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
    }))

    candlestickSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)

    requestAnimationFrame(() => {
      if (!chartRef.current) return

      const totalBars = data.length
      const barsToView = 60
      const offsetRightSpace = 8

      chartRef.current.timeScale().setVisibleLogicalRange({
        from: totalBars - barsToView,
        to: totalBars + offsetRightSpace,
      })
    })

    activeDrawingsRef.current.forEach(drawing => {
      drawingManagerRef.current.removeDrawing(drawing)
    })
    activeDrawingsRef.current = []

    const startTime = data[0].time
    const endTime = data[data.length - 1].time

    resistance.forEach((rangeStr, index) => {
      const prices = parsePriceRange(rangeStr)

      if (prices.length === 2) {
        const minPrice = Math.min(prices[0], prices[1])
        const maxPrice = Math.max(prices[0], prices[1])

        const rect = new Rectangle(
          `res-zone-${index}`,
          [
            { time: startTime, price: maxPrice },
            { time: endTime, price: minPrice }
          ],
          {
            fillColor: 'rgba(239, 83, 80, 0.15)',
            lineColor: 'rgba(239, 83, 80, 0.6)',
            lineWidth: 1
          },
          {
            locked: true,
          }
        )

        drawingManagerRef.current.addDrawing(rect)
        activeDrawingsRef.current.push(rect)
      }
    })

    support.forEach((rangeStr, index) => {
      const prices = parsePriceRange(rangeStr)

      if (prices.length === 2) {
        const minPrice = Math.min(prices[0], prices[1])
        const maxPrice = Math.max(prices[0], prices[1])

        const rect = new Rectangle(
          `sup-zone-${index}`,
          [
            { time: startTime, price: maxPrice },
            { time: endTime, price: minPrice }
          ],
          {
            fillColor: 'rgba(38, 166, 154, 0.15)',
            lineColor: 'rgba(38, 166, 154, 0.6)',
            lineWidth: 1,
          },
          {
            locked: true,
          }
        )

        drawingManagerRef.current.addDrawing(rect)
        activeDrawingsRef.current.push(rect)
      }
    })

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, support, resistance])

  return (
    <div style={{ position: 'relative', width: '100%', backgroundColor: '#131722', borderRadius: '8px', padding: '15px' }}>
      <div ref={chartContainerRef} />
    </div>
  )
}