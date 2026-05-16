export const parseJsonStringToObject = (jsonString: string) => {
  return JSON.parse(jsonString!.trim().replace('`', '').replace('json', '').replace('\n', ''))
}