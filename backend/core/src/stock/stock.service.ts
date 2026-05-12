import { Injectable } from '@nestjs/common'
import { GoogleGenAI } from '@google/genai'
import { ConfigService } from '@nestjs/config'
import { getCsv } from '@utils/get-csv'

@Injectable()
export class StockService {
	private ai: GoogleGenAI
	private model: string

	constructor(private configService: ConfigService) {
		this.ai = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') })
		this.model = this.configService.getOrThrow<string>('AI_MODEL')
	}

	async analyze(ticker: string) {
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

		const systemInstruction = `
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

		const prompt = `
			Analisis data historis harga, laporan keuangan, dan neraca keuangan berikut.

			Tugas:
			- Tentukan tren harga
			- Cari support dan resistance
			- Ringkas penjelasan teknikal
			- Ringkas penjelasan broker summary
			- Ringkas laporan keuangan
			- Ringkas neraca keuangan
			- Kesimpulan
			- Rekomendasi

			Aturan support & resistance:
			- tren harga antara "Bullish" | "Bearish"
			- support harus <= harga terakhir
			- support harus >= harga terendah
			- resistance harus >= harga terakhir
			- resistance harus <= harga tertinggi
			- maksimal 3 support
			- maksimal 3 resistance
			- jarak antar range minimal 3%
			- gunakan format: "1000 - 1050"
			- urutkan dari harga terendah ke tertinggi
			- Kesimpulan dari semua aspek sebelumnya
			- Rekomendasi antara "Buy" | "Avoid"

			Format output:
			{	
				"latestPrice": number,
				"latestDate": "tanggal terakhir",
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
				"reccomendation": "rekomendasi buy atau avoid"
			}
		`

		const responseAi = await this.ai.models.generateContent({
			model: this.model,
			config: {
				responseMimeType: 'application/json',
				systemInstruction
			},
			contents: [
				{
					text: prompt,
				},
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
			],
		})

		return JSON.parse(responseAi.text!)
	}
}
