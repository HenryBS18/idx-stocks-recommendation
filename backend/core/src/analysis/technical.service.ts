import { CACHE_TTL } from '@app/constants'
import { TechnicalAnalysis } from '@app/types'
import { getCsv, getStockLatestPriceDate, parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { AiService } from 'src/ai/ai.service'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class TechnicalService {
	constructor(
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
		private readonly aiService: AiService,
		private readonly env: EnvService,
	) { }

	async getAnalysis(ticker: string): Promise<TechnicalAnalysis> {
		Logger.debug('Hit', TechnicalService.name)

		const cacheKey = `${ticker}-technical`

		if (this.env.CACHE_ENABLED) {
			const cachedTechnicalAnalysis = await this.cacheManager.get<TechnicalAnalysis>(cacheKey)
			if (cachedTechnicalAnalysis) return cachedTechnicalAnalysis
		}

		const prompt = `
			Analisis data historis harga berikut.

			Tugas:
			- Tentukan tren harga
			- Cari support dan resistance
			- Ringkas penjelasan teknikal

			Aturan tren harga:
			- Tentukan berdasarkan pergerakan harga
			- Jika pergerakan harga cenderung naik maka output "Bullish", jika tidak maka output "Bearish"

			Aturan support & resistance:
			- Support harus <= harga terakhir
			- Support harus >= harga terendah
			- Resistance harus >= harga terakhir
			- Resistance harus <= harga tertinggi
			- Maksimal 3 support
			- Maksimal 3 resistance
			- Jarak antar range minimal 3%
			- Gunakan format: "1000 - 1050"
			- Urutkan dari harga terendah ke tertinggi

			Format output:
			{
				"trend": "tren",
				"support": [
					"1000 - 1050"
				],
				"resistance": [
					"1100 - 1150"
				],
				"technical": "ringkasan penjelasan teknikal"
			}
		`

		const priceHistoricalFilePath = await getCsv(ticker, 'price-historical')

		try {
			const [stockLatestPriceDate, priceHistoricalUploadedFile] = await Promise.all([
				getStockLatestPriceDate(priceHistoricalFilePath),
				this.aiService.upload({
					file: priceHistoricalFilePath,
					config: {
						mimeType: 'text/csv',
					},
				})
			])

			const response = await this.aiService.generateContent({
				contents: [
					{
						fileData: {
							displayName: priceHistoricalUploadedFile.displayName,
							fileUri: priceHistoricalUploadedFile.uri,
							mimeType: priceHistoricalUploadedFile.mimeType,
						},
					},
					{
						text: prompt,
					},
				],
			})

			const technicalAnalysis = parseJson<TechnicalAnalysis>(response.text!)

			if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, technicalAnalysis, CACHE_TTL)

			return {
				...stockLatestPriceDate,
				...technicalAnalysis
			}
		} finally {
			await unlink(priceHistoricalFilePath)
		}
	}
}