import { Logger } from '@nestjs/common'

export const parseJson = <T>(jsonString: string): T => {
  try {
    return JSON.parse(jsonString!.trim().replace('`', '').replace('json', '').replace('\n', ''))
  } catch (error) {
    Logger.error(`Failed to parse JSON: ${jsonString}`)
    throw error
  }
}