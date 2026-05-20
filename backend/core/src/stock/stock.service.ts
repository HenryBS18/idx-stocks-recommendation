import { CACHE_TTL } from '@app/constants'
import { NotFoundError } from '@app/errors'
import { AnalysisResult } from '@app/types'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { EnvService } from 'src/env/env.service'
import { BrokerService } from './services/broker.service'
import { FundamentalService } from './services/fundamental.service'
import { NewsService } from './services/news.service'
import { SummaryService } from './services/summary.service'
import { TechnicalService } from './services/technical.service'

@Injectable()
export class StockService {
	constructor(
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
		private readonly env: EnvService,
		private readonly technicalService: TechnicalService,
		private readonly brokerService: BrokerService,
		private readonly fundamentalService: FundamentalService,
		private readonly newsService: NewsService,
		private readonly summaryService: SummaryService,
	) { }

	async analyze(ticker: string): Promise<AnalysisResult> {
		Logger.debug('Hit', this.analyze.name)

		try {
			ticker = ticker.toUpperCase()

			const cacheKey = `${ticker}-analysis`

			if (this.env.CACHE_ENABLED) {
				const cachedAnalysis = await this.cacheManager.get<AnalysisResult>(cacheKey)
				if (cachedAnalysis) return cachedAnalysis
			}

			const stockNameResponse = await fetch(`${this.env.STOCK_DATA_API_URL}/stock/${ticker}/name`)
			const data = await stockNameResponse.json()

			if (!stockNameResponse.ok) throw new NotFoundError(data.message)

			const [technical, broker, fundamental, news] = await Promise.all([
				this.technicalService.getTechnical(ticker),
				this.brokerService.getBroker(ticker),
				this.fundamentalService.getFundamental(ticker),
				this.newsService.getNews(ticker)
			])

			const summary = await this.summaryService.getSummary({ ticker, technical, broker, fundamental, news })

			const returnData: AnalysisResult = {
				ticker,
				name: data.name,
				...technical,
				...broker,
				...fundamental,
				...news,
				...summary,
			}

			if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, returnData, CACHE_TTL)

			return returnData
		} catch (error) {
			if (error instanceof Error) Logger.error(error.message, `${StockService.name}-${this.analyze.name}`)
			throw error
		}
	}
}
