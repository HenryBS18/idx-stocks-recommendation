import { CACHE_TTL } from '@constants/cache'
import { NotFoundError } from '@errors/not-found-error'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AnalysisResult } from '@types'
import { getStockLatestPriceDate } from '@utils/get-stock-latest-price-date'
import { BrokerService } from './services/broker.service'
import { FundamentalService } from './services/fundamental.service'
import { NewsService } from './services/news.service'
import { SummaryService } from './services/summary.service'
import { TechnicalService } from './services/technical.service'

@Injectable()
export class StockService {
	private readonly stockDataApiUrl: string
	private readonly cacheEnabled: boolean

	constructor(
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
		private readonly configService: ConfigService,
		private readonly technicalService: TechnicalService,
		private readonly brokerService: BrokerService,
		private readonly fundamentalService: FundamentalService,
		private readonly newsService: NewsService,
		private readonly summaryService: SummaryService,

	) {
		this.stockDataApiUrl = this.configService.getOrThrow<string>('STOCK_DATA_API_URL')
		this.cacheEnabled = this.configService.getOrThrow<string>('CACHE_ENABLED') === 'true'
	}

	async analyze(ticker: string): Promise<AnalysisResult> {
		try {
			ticker = ticker.toUpperCase()

			const cacheKey = `${ticker}-analysis`

			if (this.cacheEnabled) {
				const cachedAnalysis = await this.cacheManager.get<AnalysisResult>(cacheKey)
				if (cachedAnalysis) return cachedAnalysis
			}

			const stockNameResponse = await fetch(`${this.stockDataApiUrl}/stock/${ticker}/name`)
			const data = await stockNameResponse.json()

			if (!stockNameResponse.ok) throw new NotFoundError(data.message)

			const [stockLatestPriceDate, technical, broker, fundamental, news] = await Promise.all([
				getStockLatestPriceDate(ticker),
				this.technicalService.getTechnical(ticker),
				this.brokerService.getBroker(ticker),
				this.fundamentalService.getFundamental(ticker),
				this.newsService.getNews(ticker)
			])

			const summary = await this.summaryService.getSummary({ technical, broker, fundamental, news })

			const returnData: AnalysisResult = {
				...stockLatestPriceDate,
				name: data.name,
				...technical,
				...broker,
				...fundamental,
				...news,
				...summary,
			}

			if (this.cacheEnabled) await this.cacheManager.set(cacheKey, returnData, CACHE_TTL)

			return returnData
		} catch (error) {
			if (error instanceof Error) Logger.error(error.message, `${StockService.name}-${this.analyze.name}`)
			throw error
		}
	}
}
