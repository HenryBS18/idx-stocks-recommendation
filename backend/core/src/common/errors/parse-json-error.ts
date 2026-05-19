export class ParseJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseJsonError'
  }
}