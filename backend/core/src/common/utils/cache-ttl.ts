import { LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@app/constants'

export const cacheTTL = (): number => {
  const now = new Date()

  const utc8 = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
  )

  const day = utc8.getDay()
  const hour = utc8.getHours()

  const isWeekend = day === 0 || day === 6
  const isAfterMarketClose = hour >= 17

  return (isWeekend || isAfterMarketClose) ? LONG_CACHE_TTL : SHORT_CACHE_TTL
}