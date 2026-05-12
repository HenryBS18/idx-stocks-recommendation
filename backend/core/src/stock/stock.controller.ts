import { Controller, Get, Param } from '@nestjs/common'
import { StockService } from './stock.service'

@Controller('stock')
export class StockController {
	constructor(private readonly stockService: StockService) { }

	@Get(':ticker')
	async test(@Param('ticker') ticker: string) {
		return await this.stockService.analyze(ticker)
	}
}
