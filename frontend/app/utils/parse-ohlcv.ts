export const parseOHLCV = (csv: string) => {
  const lines = csv.trim().split("\n")

  return lines.slice(1).reverse().map(line => {
    const [time, open, high, low, close, volume] = line.split(",")

    return {
      time,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    }
  })
}