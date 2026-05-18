import { Injectable } from '@nestjs/common'
import { TechnicalAnalysis } from '@types'
import { getCsv } from '@utils/get-csv'
import { parseJson } from '@utils/parse-json'
import { AiService } from './ai.service'

@Injectable()
export class TechnicalService {
	constructor(private readonly aiService: AiService) { }

	async getTechnical(ticker: string): Promise<TechnicalAnalysis> {
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

		const priceHistoricalUploadedFile = await this.aiService.upload({
			file: priceHistoricalFilePath,
			config: {
				mimeType: 'text/csv',
			},
		})

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

		return parseJson<TechnicalAnalysis>(response.text!)
	}
}