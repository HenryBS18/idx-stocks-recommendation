import { Injectable } from '@nestjs/common'
import { GoogleGenAI } from '@google/genai'
import { ConfigService } from '@nestjs/config'
import { getCsv } from '@utils/get-csv'
import { getStockLatestPriceDate } from '@utils/get-stock-latest-price-date'
import { AnalysisResult } from '@types'
import { NotFoundError } from '@errors/not-found-error'

@Injectable()
export class StockService {
	private ai: GoogleGenAI
	private model: string
	private stockDataBaseApiUrl: string

	constructor(private configService: ConfigService) {
		this.ai = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') })
		this.model = this.configService.getOrThrow<string>('AI_MODEL')
		this.stockDataBaseApiUrl = this.configService.getOrThrow<string>('STOCK_DATA_BASE_API_URL')
	}

	async analyze(ticker: string): Promise<AnalysisResult> {
		const stockNameResponse = await fetch(`${this.stockDataBaseApiUrl}/stock/${ticker}/name`)
		const data = await stockNameResponse.json()

		if (!stockNameResponse.ok) throw new NotFoundError(data.message)

		const priceHistoricalFilePath = await getCsv(ticker, 'price-historical')
		const brokerSummaryFilePath = await getCsv(ticker, 'broker-summary')
		const financialsFilePath = await getCsv(ticker, 'financials')
		const balanceSheetFilePath = await getCsv(ticker, 'balance-sheet')

		const priceHistoricalUploadedFile = await this.ai.files.upload({
			file: priceHistoricalFilePath,
			config: {
				mimeType: 'text/csv',
			},
		})

		const brokerSummaryUploadedFile = await this.ai.files.upload({
			file: brokerSummaryFilePath,
			config: {
				mimeType: 'text/csv',
			},
		})

		const financialsUploadedFile = await this.ai.files.upload({
			file: financialsFilePath,
			config: {
				mimeType: 'text/csv',
			},
		})

		const balanceSheetUploadedFile = await this.ai.files.upload({
			file: balanceSheetFilePath,
			config: {
				mimeType: 'text/csv',
			},
		})

		const systemInstructionNews = `
			Anda adalah API analisis saham Indonesia.

			Aturan output:
			- Kembalikan dalam bentuk teks
			- Jangan gunakan format markdown
			- Jangan gunakan *text*
			- Gunakan Bahasa Indonesia untuk seluruh isi teks
		`

		const systemInstructionAnalysis = `
			Anda adalah API analisis saham Indonesia.

			Aturan output:
			- Kembalikan HANYA JSON valid
			- Jangan gunakan markdown
			- Jangan gunakan \`\`\`
			- Jangan tambahkan penjelasan apapun
			- Output harus bisa langsung diparse menggunakan JSON.parse()
			- Gunakan Bahasa Indonesia untuk seluruh isi teks
			- Jangan gunakan null
			- Jangan kosongkan field kecuali data benar-benar tidak tersedia
		`

		const analysisPrompt = `
			Analisis data historis harga, broker summary, laporan keuangan, neraca keuangan, dan berita berikut.

			Tugas:
			- Tentukan tren harga
			- Cari support dan resistance
			- Ringkas penjelasan teknikal
			- Ringkas penjelasan broker summary
			- Ringkas laporan keuangan
			- Ringkas neraca keuangan
			- Kesimpulan
			- Rekomendasi

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

			Aturan laporan keuangan:
			- Jika data tidak tersedia maka output "Data fundamental tidak tersedia saat ini"

			Aturan neraca keuangan:
			- jika data tidak tersedia maka output ""
			
			Aturan Kesimpulan:
			- Kesimpulan dari semua data yang disebutkan diawal
			
			Aturan Rekomendasi:
			- Tentukan berdasarkan semua data yang disebutkan diawal
			- Jika kesimpulannya baik maka output "Buy", jika tidak maka output "Avoid"

			Format output:
			{
				"trend": "tren",
				"support": [
					"1000 - 1050"
				],
				"resistance": [
					"1100 - 1150"
				],
				"technical": "ringkasan penjelasan teknikal",
				"brokerSummary": "ringkasan penjelasan broker summary",
				"financials": "ringkasan laporan keuangan",
				"balanceSheet": "ringkasan neraca keuangan",
				"summary": "kesimpulan semua aspek sebelumnya",
				"recommendation": "rekomendasi buy atau avoid"
			}
		`

		const today = new Date().toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})

		const newsPrompt = `
			Cari berita paling mutakhir emiten ${ticker} khusus untuk tanggal hari ini ${today}.
			Jika tidak ada berita paling mutakhir untuk emiten ${ticker}, maka cari berita sebelumnya.
			Jangan cari berita emiten lain.
			Ringkas dalam 1 paragraf.
		`

		try {
			const newsResponse = await this.ai.models.generateContent({
				model: this.model,
				config: {
					systemInstruction: systemInstructionNews,
					temperature: 0.1,
					tools: [
						{
							googleSearch: {},
						},
					],
				},
				contents: [
					{
						text: newsPrompt,
					},
				],
			})

			const news = `
				Berita:
				${newsResponse.text}
			`

			const analysisResponse = await this.ai.models.generateContent({
				model: this.model,
				config: {
					systemInstruction: systemInstructionAnalysis,
					temperature: 0.1,
					responseMimeType: 'application/json'
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
						fileData: {
							displayName: brokerSummaryUploadedFile.displayName,
							fileUri: brokerSummaryUploadedFile.uri,
							mimeType: brokerSummaryUploadedFile.mimeType,
						},
					},
					{
						fileData: {
							displayName: financialsUploadedFile.displayName,
							fileUri: financialsUploadedFile.uri,
							mimeType: financialsUploadedFile.mimeType,
						},
					},
					{
						fileData: {
							displayName: balanceSheetUploadedFile.displayName,
							fileUri: balanceSheetUploadedFile.uri,
							mimeType: balanceSheetUploadedFile.mimeType,
						},
					},
					{
						text: news
					},
					{
						text: analysisPrompt,
					},
				],
			})

			const stockLatestPriceDate = await getStockLatestPriceDate(priceHistoricalFilePath)

			return {
				...stockLatestPriceDate,
				name: data.name,
				...JSON.parse(analysisResponse.text!.trim().replace('`', '').replace('json', '').replace('\n', '')),
				news: newsResponse.text
			}
		} catch (error) {
			throw error
		}
	}
}
