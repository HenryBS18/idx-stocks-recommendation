import { NotFoundError } from '@app/errors'
import { AnalysisResult } from '@app/types'
import { cacheTTL } from '@app/utils/cache-ttl'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { BrokerService } from 'src/analysis/broker.service'
import { FundamentalService } from 'src/analysis/fundamental.service'
import { NewsService } from 'src/analysis/news.service'
import { SummaryService } from 'src/analysis/summary.service'
import { TechnicalService } from 'src/analysis/technical.service'
import { EnvService } from 'src/env/env.service'

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
				this.technicalService.getAnalysis(ticker),
				this.brokerService.getAnalysis(ticker),
				this.fundamentalService.getAnalysis(ticker),
				this.newsService.getAnalysis(ticker)
			])

			const summary = await this.summaryService.getAnalysis({ ticker, technical, broker, fundamental, news })

			const returnData: AnalysisResult = {
				ticker,
				name: data.name,
				...technical,
				...broker,
				...fundamental,
				...news,
				...summary,
			}

			if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, returnData, cacheTTL())

			return returnData
		} catch (error) {
			if (error instanceof Error) Logger.error(error.message, `${StockService.name}-${this.analyze.name}`)
			throw error
		}
	}
}
