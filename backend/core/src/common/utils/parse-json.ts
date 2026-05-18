export const parseJson = <T>(jsonString: string): T => {
  try {
    return JSON.parse(jsonString!.trim().replace('`', '').replace('json', '').replace('\n', ''))
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${jsonString}`)
  }
}