import { NewsAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { cacheTTL } from '@app/utils/cache-ttl'
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
      Hari ini adalah ${today}. Gunakan ini sebagai referensi waktu, bukan filter ketat.

      Cakupan pencarian (urutan prioritas):
      - Berita langsung tentang emiten ${ticker}
      - Berita sektor industri yang relevan dengan ${ticker}
      - Sentimen atau kebijakan domestik dan internasional yang berdampak pada ${ticker}
      - Hasil review atau rebalancing indeks global terbaru (MSCI, FTSE, GDX/GDXJ)
        yang mencakup ${ticker}, terlepas dari kapan review itu diumumkan

      Aturan umum:
      - Utamakan berita paling baru yang tersedia, idealnya hari ini (${today})
      - Jika belum ada berita hari ini, ambil yang paling mendekati
      - Fokus pada informasi yang relevan dengan pergerakan atau prospek saham ${ticker}
      - Jangan sebut tanggal spesifik dalam ringkasan, gunakan frasa "berita terbaru"
      - Isi ringkasan hanya dari data berita saja, TIDAK BOLEH hasil karangan
      - Tulis ringkasan yang informatif, maksimal 1000 karakter

      Aturan KHUSUS indeks global — ikuti dengan ketat:
      - HANYA sebut indeks global jika kamu menemukan hasil review atau rebalancing
        yang secara eksplisit menyebut ${ticker} masuk, keluar, upgrade, downgrade,
        atau perubahan bobot
      - Jika tidak menemukan hasil review tersebut, HAPUS seluruh kalimat tentang
        indeks global dari ringkasan — jangan ganti dengan kalimat "tidak ada perubahan",
        "belum terdapat laporan", atau kalimat sejenis

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

    Logger.debug(`News Token: ${response.usageMetadata?.totalTokenCount}`, NewsService.name)

    const newsAnalysis = parseJson<NewsAnalysis>(response.text!)

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, newsAnalysis, cacheTTL())

    return newsAnalysis
  }
}