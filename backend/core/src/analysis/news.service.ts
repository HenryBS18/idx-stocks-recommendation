import { CACHE_TTL } from '@app/constants'
import { NewsAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AiService } from 'src/ai/ai.service'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class NewsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly env: EnvService,
  ) { }

  async getAnalysis(ticker: string): Promise<NewsAnalysis> {
    Logger.debug('Hit', NewsService.name)

    const cacheKey = `${ticker}-news`

    if (this.env.CACHE_ENABLED) {
      const cachedNewsAnalysis = await this.cacheManager.get<NewsAnalysis>(cacheKey)
      if (cachedNewsAnalysis) return cachedNewsAnalysis
    }

    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const prompt = `
      Tugas:
      - Cari berita paling mutakhir emiten ${ticker} khusus untuk tanggal hari ini ${today}

      Aturan:
			- Jika tidak ada berita paling mutakhir untuk emiten ${ticker}, maka cari berita sebelumnya.
			- Jangan cari berita emiten lain.
			- Ringkas dalam 1 paragraf.

      Format output:
			{
				"news": "ringkasan berita"
			}
		`

    const response = await this.aiService.generateContent({
      config: {
        responseMimeType: 'text/plain',
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
      contents: [
        {
          text: prompt,
        },
      ],
    })

    const newsAnalysis = parseJson<NewsAnalysis>(response.text!)

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, newsAnalysis, CACHE_TTL)

    return newsAnalysis
  }
}