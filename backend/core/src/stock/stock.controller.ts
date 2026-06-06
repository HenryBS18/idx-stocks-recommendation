import { NotFoundError } from '@app/errors'
import { Controller, Get, InternalServerErrorException, NotFoundException, Param } from '@nestjs/common'
import { StockService } from './stock.service'

@Controller('stock')
export class StockController {
	constructor(private readonly stockService: StockService) { }

	@Get(':ticker')
	async stock(@Param('ticker') ticker: string) {
		try {
			return await this.stockService.analyze(ticker)
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new NotFoundException({
					message: error.message
				})
			}

			if (error instanceof Error) {
				throw new InternalServerErrorException({
					message: 'Terjadi kesalahan di server'
				})
			}
		}
	}
}
