export const parseCsv = (csvString: string): Record<string, string>[] => {
  const lines = csvString.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim())
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',')

    if (currentLine.length !== headers.length) continue

    const rowObject: Record<string, string> = {}

    headers.forEach((header, index) => {
      rowObject[header] = currentLine[index].trim()
    })

    result.push(rowObject)
  }

  return result
}