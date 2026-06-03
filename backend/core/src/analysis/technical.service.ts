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
			Data yang diberikan adalah data OHLCV harian selama tiga bulan terakhir dengan kolom: Date, Open, High, Low, Close, Volume.

			Tugas:
			- Tentukan tren harga dominan
			- Identifikasi level support dan resistance yang valid
			- Buat ringkasan teknikal

			Aturan tren harga:
			- Analisis berdasarkan struktur higher high/higher low atau lower high/lower low
			- Pertimbangkan posisi harga terhadap moving average 20 dan 50 periode
			- Output: "Bullish" jika tren naik, "Bearish" jika tren turun, "Sideways" jika ranging

			Aturan support & resistance:
			- Tentukan berdasarkan swing high/low yang telah diuji minimal 2 kali
			- Support: harga <= harga terakhir, >= harga terendah keseluruhan
			- Resistance: harga >= harga terakhir, <= harga tertinggi keseluruhan
			- Maksimal 3 support, maksimal 3 resistance
			- Jarak antar level minimal 3%
			- Format range: "1000 - 1050" (gunakan angka bulat, tanpa desimal)
			- Urutkan dari nilai terendah ke tertinggi

			Format output:
			{
				"trend": "Bullish|Sideways|Bearish",
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

			Logger.debug(`Technical Token: ${response.usageMetadata?.totalTokenCount}`, TechnicalService.name)

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