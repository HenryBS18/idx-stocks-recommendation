import { GetSummaryParams, SummaryAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { cacheTTL } from '@app/utils/cache-ttl'
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
			Kamu diberikan data berikut:
      - ringkasan analisis teknikal
      - ringkasan analisis fundamental
      - ringkasan analisis broker summary
      - ringkasan analisis berita

			Tugas:
      - Baca dan pahami semua data di atas secara menyeluruh
			- Buat kesimpulan yang menggabungkan semua aspek (teknikal, fundamental, broker summary, dan berita)
			- Tentukan rekomendasi akhir
			
			Aturan Kesimpulan:
			- Sebutkan faktor paling dominan yang mempengaruhi kesimpulan
      - Jika ada data yang saling bertentangan, sebutkan konfliknya secara singkat
      - Diakhir Jelaskan mengapa rekomendasinya "Buy" atau "Avoid"
      - Gunakan kalimat yang mudah dimengerti bahkan oleh orang awam
			
			Aturan Rekomendasi:
      - "Buy"   → jika mayoritas indikator positif dan risiko terukur
      - "Avoid" → jika mayoritas indikator negatif atau risiko terlalu tinggi

			Format output:
			{
				"summary": "kesimpulan disini",
				"recommendation": "Buy|Avoid"
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

    Logger.debug(`Summary Token: ${response.usageMetadata?.totalTokenCount}`, SummaryService.name)

    const summaryAnalysis = parseJson<SummaryAnalysis>(response.text!)

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, summaryAnalysis, cacheTTL())

    return summaryAnalysis
  }
}