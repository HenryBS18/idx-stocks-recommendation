import { CACHE_TTL } from '@app/constants'
import { GetSummaryParams, SummaryAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AiService } from './ai.service'

@Injectable()
export class SummaryService {
  private readonly cacheEnabled: boolean

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.getOrThrow<string>('CACHE_ENABLED') === 'true'
  }

  async getSummary({ ticker, technical, broker, fundamental, news }: GetSummaryParams): Promise<SummaryAnalysis> {
    const cacheKey = `${ticker}-summary`

    if (this.cacheEnabled) {
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

    if (this.cacheEnabled) await this.cacheManager.set(cacheKey, summaryAnalysis, CACHE_TTL)

    return summaryAnalysis
  }
}