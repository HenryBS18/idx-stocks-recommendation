import { NotFoundError, ParseJsonError } from '@app/errors'
import { Controller, Get, InternalServerErrorException, NotFoundException, Param } from '@nestjs/common'
import { StockService } from './stock.service'

@Controller('stock')
export class StockController {
	constructor(private readonly stockService: StockService) { }

	@Get(':ticker')
	async test(@Param('ticker') ticker: string) {
		try {
			return await this.stockService.analyze(ticker)
		} catch (error) {
			if (error instanceof ParseJsonError) {
				throw new NotFoundException({
					message: 'Something went wrong.'
				})
			}

			if (error instanceof NotFoundError) {
				throw new NotFoundException({
					message: error.message
				})
			}

			if (error instanceof Error) {
				throw new InternalServerErrorException({
					message: error.message
				})
			}
		}
	}
}
