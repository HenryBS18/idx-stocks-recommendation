import { NotFoundError } from '@app/errors'
import type { Timeframe } from '@app/types'
import { Controller, Get, InternalServerErrorException, NotFoundException, Param, Query } from '@nestjs/common'
import { StockService } from './stock.service'

@Controller('stock')
export class StockController {
	constructor(private readonly stockService: StockService) { }

	@Get(':ticker')
	async stock(@Param('ticker') ticker: string, @Query('timeframe') timeframe: Timeframe = 'medium') {
		try {
			return await this.stockService.analyze(ticker, timeframe)
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
