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
				dataDuration = 'enam bulan terakhir'
				maRules = 'moving average 5 (MA5) dan 20 (MA20) periode untuk mendeteksi momentum cepat'
				strategyContext = 'Fokus pada pergerakan jangka pendek (1 hari - 1 minggu). Identifikasi level support/resistance minor terdekat untuk kebutuhan fast-trade atau day trading.'
				break
			case 'medium':
				dataDuration = 'enam bulan terakhir'
				maRules = 'moving average 20 (MA20) dan 50 (MA50) periode untuk mengukur kekuatan tren menengah'
				strategyContext = 'Fokus pada struktur tren swing trading (2 minggu - 3 bulan). Cari pola pembalikan arah (reversal) atau kelanjutan tren (continuation) berdasarkan higher high / lower low yang lebih terkonfirmasi.'
				break
			case 'long':
				dataDuration = 'enam bulan terakhir'
				maRules = 'moving average 50 (MA50) dan 200 (MA200) periode untuk mendeteksi tren makro (misal: Golden Cross atau Death Cross)'
				strategyContext = 'Fokus pada siklus besar investasi jangka panjang (di atas 6 bulan). Cari area major support/resistance historis untuk menentukan apakah harga berada di area bottoming atau sudah di pucuk.'
				break
			default:
				dataDuration = 'enam bulan terakhir'
				maRules = 'moving average 20 dan 50 periode'
				strategyContext = 'Fokus pada tren pergerakan harga secara umum.'
		}

		const systemInstruction = `
			Anda adalah seorang analis teknikal senior (Chartist) spesialis Bursa Efek Indonesia (BEI). Tugas Anda adalah membedah data pergerakan harga historis (OHLCV) dari file yang dilampirkan menjadi analisis grafik yang taktis dan mudah dipahami investor pemula.

			PANDUAN ANALISIS TEKNIKAL:
			- Tentukan tren harga berdasarkan struktur Higher High/Higher Low (Uptrend) atau Lower High/Lower Low (Downtrend).
			- Validasi area Support & Resistance berdasarkan titik swing high/low yang minimal pernah diuji/disentuh 2 kali pada periode data.
			- Level Support harus <= harga terakhir dan >= harga terendah keseluruhan di periode ini.
			- Level Resistance harus >= harga terakhir dan <= harga tertinggi keseluruhan di periode ini.
			- Batasi maksimal 5 level untuk masing-masing Support & Resistance, dengan jarak antar level minimal 5%. Format berupa range angka bulat tanpa desimal (Contoh: "1000 - 1050"), diurutkan dari nilai terkecil ke terbesar.

			PANDUAN EDUKASI INVESTOR PEMULA:
			- Setiap kali Anda menyebutkan istilah teknikal grafik (seperti Bullish, Bearish, Sideways, Breakout, Breakdown, Golden Cross, Death Cross, Rebound), Anda WAJIB memberikan penjelasan singkat atau analogi ringkas di dalam tanda kurung. (Contoh: "Saham berhasil breakout (menembus batas dinding harga atas)...").

			ATURAN FORMAT OUTPUT (JSON & HTML TAILWIND):
			1. Output harus berupa JSON murni yang valid sesuai schema dengan key "trend", "support", "resistance", dan "technical". JANGAN gunakan backticks (\`\`\`json ... \`\`\`).
			2. Nilai pada properti "trend" HARUS berupa teks murni (pilih salah satu: "Bullish", "Bearish", atau "Sideways") TANPA tag HTML.
			3. Di dalam string penjelasan "technical", gunakan teks paragraf mengalir yang disisipi tag HTML <span> untuk mewarnai kata kunci penting.
			4. WAJIB menggunakan tanda kutip satu (') untuk class Tailwind di dalam tag HTML (Contoh: class='text-emerald-400'). JANGAN PERNAH gunakan kutip dua (\") di dalam tag HTML karena akan memutus string JSON!
			5. Skema Warna Class Tailwind pada properti "technical":
				* Kondisi Tren Naik / Bullish / Breakout / Rebound: <span class='text-emerald-400 font-semibold'>Kata/Kalimat</span>
				* Kondisi Tren Turun / Bearish / Breakdown / Rejection: <span class='text-rose-400 font-semibold'>Kata/Kalimat</span>
				* Kondisi Konsolidasi / Sideways / Area S&R: <span class='text-amber-400 font-semibold'>Kata/Kalimat</span>
				* Nama Indikator / Moving Average (misal: MA5, MA200, Golden Cross): <span class='text-sky-400 font-medium'>INDIKATOR</span>
		`

		const prompt = `
			Saham Target: ${ticker}

			Analisis data pergerakan harga OHLCV harian saham ${ticker} yang terlampir pada file data selama periode ${dataDuration}.

			KONTEKS STRATEGI PENGGUNA:
			${strategyContext}
			
			Aturan Tambahan:
			- Pertimbangkan posisi harga terakhir terhadap ${maRules}.
			- Jangan sebut angka mentah yang terlalu spesifik pada penjelasan ringkasan "technical" jika tidak perlu, fokus pada instruksi tindakan (kapan area beli yang aman, waspada breakdown, dll) yang sinkron dengan KONTEKS STRATEGI PENGGUNA.
		`

		const responseJsonSchema = {
			"type": "object",
			"properties": {
				"trend": {
					"type": "string"
				},
				"support": {
					"type": "array",
					"items": {
						"type": "string"
					}
				},
				"resistance": {
					"type": "array",
					"items": {
						"type": "string"
					}
				},
				"technical": {
					"type": "string"
				}
			},
			"propertyOrdering": [
				"trend",
				"support",
				"resistance",
				"technical"
			],
			"required": [
				"trend",
				"support",
				"resistance",
				"technical"
			]
		}

		const priceHistoricalFilePath = await getCsv(ticker, 'price-historical', 'medium')

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
				config: {
					systemInstruction,
					responseJsonSchema,
				},
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