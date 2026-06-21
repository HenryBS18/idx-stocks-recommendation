import { TechnicalAnalysis, Timeframe } from '@app/types'
import { getCsv, getStockLatestPriceDate, parseJson } from '@app/utils'
import { cacheTTL } from '@app/utils/cache-ttl'
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

	async getAnalysis(ticker: string, timeframe: Timeframe): Promise<TechnicalAnalysis> {
		Logger.debug('Hit', TechnicalService.name)

		const cacheKey = `${ticker}-technical-${timeframe}`

		if (this.env.CACHE_ENABLED) {
			const cachedTechnicalAnalysis = await this.cacheManager.get<TechnicalAnalysis>(cacheKey)
			if (cachedTechnicalAnalysis) return cachedTechnicalAnalysis
		}

		let dataDuration = ''
		let maRules = ''
		let strategyContext = ''

		switch (timeframe) {
			case 'short':
				dataDuration = 'tiga bulan terakhir'
				maRules = 'moving average 5 (MA5) dan 20 (MA20) periode untuk mendeteksi momentum cepat'
				strategyContext = 'Fokus pada pergerakan jangka pendek (1 hari - 1 minggu). Identifikasi level support/resistance minor terdekat untuk kebutuhan fast-trade atau day trading.'
				break
			case 'medium':
				dataDuration = 'enam bulan terakhir'
				maRules = 'moving average 20 (MA20) dan 50 (MA50) periode untuk mengukur kekuatan tren menengah'
				strategyContext = 'Fokus pada struktur tren swing trading (2 minggu - 3 bulan). Cari pola pembalikan arah (reversal) atau kelanjutan tren (continuation) berdasarkan higher high / lower low yang lebih terkonfirmasi.'
				break
			case 'long':
				dataDuration = 'satu tahun terakhir'
				maRules = 'moving average 50 (MA50) dan 200 (MA200) periode untuk mendeteksi tren makro (misal: Golden Cross atau Death Cross)'
				strategyContext = 'Fokus pada siklus besar investasi jangka panjang (di atas 6 bulan). Cari area major support/resistance historis untuk menentukan apakah harga berada di area bottoming atau sudah di pucuk.'
				break
			default:
				dataDuration = 'tiga bulan terakhir'
				maRules = 'moving average 20 dan 50 periode'
				strategyContext = 'Fokus pada tren pergerakan harga secara umum.'
		}

		const prompt = `
      Data yang diberikan adalah data OHLCV harian saham ${ticker} selama ${dataDuration} dengan kolom: Date, Open, High, Low, Close, Volume.

      KONTEKS STRATEGI:
      ${strategyContext}

      Tugas:
      - Tentukan tren harga dominan
      - Identifikasi level support dan resistance yang valid sesuai dengan timeframe data (${dataDuration})
      - Buat ringkasan teknikal yang aplikatif

      Aturan tren harga:
      - Analisis berdasarkan struktur higher high/higher low atau lower high/lower low
      - Pertimbangkan posisi harga terhadap ${maRules}
      - Output: "Bullish" jika tren naik, "Bearish" jika tren turun, "Sideways" jika ranging

      Aturan support & resistance:
      - Tentukan berdasarkan swing high/low yang telah diuji minimal 2 kali pada periode ${dataDuration}
      - Support: harga <= harga terakhir, >= harga terendah keseluruhan di periode ini
      - Resistance: harga >= harga terakhir, <= harga tertinggi keseluruhan di periode ini
      - Maksimal 3 support, maksimal 3 resistance
      - Jarak antar level minimal 3%
      - Format range: "1000 - 1050" (gunakan angka bulat, tanpa desimal)
      - Urutkan dari nilai terendah ke tertinggi

      Aturan ringkasan teknikal:
      - Gunakan Bahasa Indonesia yang mudah dipahami.
      - Berikan insight tindakan yang sesuai dengan KONTEKS STRATEGI di atas (misal: kapan area beli yang aman, waspada breakdown, dll).

      Format output wajib JSON:
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

		const priceHistoricalFilePath = await getCsv(ticker, 'price-historical', timeframe)

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

			const technicalAnalysis = {
				...stockLatestPriceDate,
				...parseJson<TechnicalAnalysis>(response.text!)
			}

			if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, technicalAnalysis, cacheTTL())

			return technicalAnalysis
		} finally {
			await unlink(priceHistoricalFilePath)
		}
	}
}