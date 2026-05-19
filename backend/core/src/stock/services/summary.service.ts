import { GetSummaryParams, SummaryAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Injectable } from '@nestjs/common'
import { AiService } from './ai.service'

@Injectable()
export class SummaryService {
  constructor(private readonly aiService: AiService) { }

  async getSummary({ technical, broker, fundamental, news }: GetSummaryParams): Promise<SummaryAnalysis> {
    const prompt = `
			Analisis hasil ringkasan teknikal, broker summary, laporan keuangan, neraca keuangan, dan berita berikut.

			Tugas:
			- Buat kesimpulan
			- Tentukan rekomendasi
			
			Aturan Kesimpulan:
			- Kesimpulan dari semua data yang diberikan
			
			Aturan Rekomendasi:
			- Tentukan berdasarkan semua data yang diberikan
			- Jika kesimpulannya baik maka output "Buy", jika tidak maka output "Avoid"

			Format output:
			{
				"summary": "kesimpulan semua aspek sebelumnya",
				"recommendation": "rekomendasi buy atau avoid"
			}
		`

    const response = await this.aiService.generateContent({
      contents: [
        {
          text: JSON.stringify(technical)
        },
        {
          text: JSON.stringify(broker)
        },
        {
          text: JSON.stringify(fundamental)
        },
        {
          text: JSON.stringify(news)
        },
        {
          text: prompt,
        },
      ],
    })

    return parseJson<SummaryAnalysis>(response.text!)
  }
}