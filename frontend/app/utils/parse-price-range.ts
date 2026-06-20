export const parsePriceRange = (rangeStr: string): number[] => {
  if (!rangeStr) return []

  return rangeStr
    .split('-')
    .map(p => parseFloat(p.trim()))
    .filter(p => !isNaN(p))
}