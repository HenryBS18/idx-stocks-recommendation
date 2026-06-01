import { CACHE_TTL } from '@app/constants'
import { GetSummaryParams, SummaryAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AiService } from 'src/ai/ai.service'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class SummaryService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly env: EnvService,
  ) {
  }

  async getAnalysis({ ticker, technical, broker, fundamental, news }: GetSummaryParams): Promise<SummaryAnalysis> {
    Logger.debug('Hit', SummaryService.name)

    const cacheKey = `${ticker}-summary`

    if (this.env.CACHE_ENABLED) {
      const cachedSummaryAnalysis = await this.cacheManager.get<SummaryAnalysis>(cacheKey)
      if (cachedSummaryAnalysis) return cachedSummaryAnalysis
    }

    const prompt = `
			Analisis hasil ringkasan teknikal, broker summary, laporan keuangan, neraca keuangan, dan berita berikut.

			Tugas:
			- Buat kesimpulan
			- Tentukan rekomendasi
			
			Aturan Kesimpulan:
			- Kesimpulan dari semua data yang diberikan
      - Gunakan kalimat yang mudah dimengerti bahkan oleh orang awam
			
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

    const summaryAnalysis = parseJson<SummaryAnalysis>(response.text!)

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, summaryAnalysis, CACHE_TTL)

    return summaryAnalysis
  }
}