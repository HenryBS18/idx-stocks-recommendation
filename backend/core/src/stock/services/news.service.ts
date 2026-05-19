import { CACHE_TTL } from '@app/constants'
import { NewsAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AiService } from './ai.service'

@Injectable()
export class NewsService {
  private readonly cacheEnabled: boolean

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.getOrThrow<string>('CACHE_ENABLED') === 'true'
  }

  async getNews(ticker: string): Promise<NewsAnalysis> {
    const cacheKey = `${ticker}-news`

    if (this.cacheEnabled) {
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

    if (this.cacheEnabled) await this.cacheManager.set(cacheKey, newsAnalysis, CACHE_TTL)

    return newsAnalysis
  }
}