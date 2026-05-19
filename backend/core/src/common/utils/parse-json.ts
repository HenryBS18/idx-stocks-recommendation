import { ParseJsonError } from '@app/errors'

export const parseJson = <T>(jsonString: string): T => {
  try {
    return JSON.parse(jsonString!.trim().replace('`', '').replace('json', '').replace('\n', ''))
  } catch (error) {
    throw new ParseJsonError(`Failed to parse JSON: ${jsonString}`)
  }
}