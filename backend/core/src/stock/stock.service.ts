import { NotFoundError } from '@errors/not-found-error'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AnalysisResult } from '@types'
import { getStockLatestPriceDate } from '@utils/get-stock-latest-price-date'
import { parseJsonStringToObject } from '@utils/parse-json-string-to-object'
import { AnalysisService } from './services/analysis.service'
import { BrokerService } from './services/broker.service'
import { FundamentalService } from './services/fundamental.service'
import { NewsService } from './services/news.service'
import { TechnicalService } from './services/technical.service'

@Injectable()
export class StockService {
	private stockDataBaseApiUrl: string

	constructor(
		private readonly configService: ConfigService,
		private readonly technicalService: TechnicalService,
		private readonly brokerService: BrokerService,
		private readonly fundamentalService: FundamentalService,
		private readonly newsService: NewsService,
		private readonly analysisService: AnalysisService
	) {
		this.stockDataBaseApiUrl = this.configService.getOrThrow<string>('STOCK_DATA_BASE_API_URL')
	}

	async analyze(ticker: string): Promise<AnalysisResult> {
		const stockNameResponse = await fetch(`${this.stockDataBaseApiUrl}/stock/${ticker}/name`)
		const data = await stockNameResponse.json()

		if (!stockNameResponse.ok) throw new NotFoundError(data.message)

		try {
			const [stockLatestPriceDate, technical, broker, fundamental, news] = await Promise.all([
				getStockLatestPriceDate(ticker),
				this.technicalService.getTechnical(ticker),
				this.brokerService.getBroker(ticker),
				this.fundamentalService.getFundamental(ticker),
				this.newsService.getNews(ticker)
			])

			const analysis = await this.analysisService.getAnalysis({ technical, broker, fundamental, news })

			return {
				...stockLatestPriceDate,
				name: data.name,
				...parseJsonStringToObject(technical),
				...parseJsonStringToObject(broker),
				...parseJsonStringToObject(fundamental),
				...parseJsonStringToObject(news),
				...parseJsonStringToObject(analysis),
			}
		} catch (error) {
			throw error
		}
	}
}
