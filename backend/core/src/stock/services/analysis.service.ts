import { Injectable } from '@nestjs/common'
import { GetAnalysisParams } from '@types'
import { AiService } from './ai.service'

@Injectable()
export class AnalysisService {
  constructor(private readonly aiService: AiService) { }

  async getAnalysis({ technical, broker, fundamental, news }: GetAnalysisParams): Promise<string> {
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
          text: technical
        },
        {
          text: broker
        },
        {
          text: fundamental
        },
        {
          text: news
        },
        {
          text: prompt,
        },
      ],
    })

    return response.text!
  }
}