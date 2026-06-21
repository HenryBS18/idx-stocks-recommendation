import { NewsAnalysisResult, Timeframe } from '@app/types'
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

  async getAnalysis(ticker: string, timeframe: Timeframe): Promise<NewsAnalysisResult> {
    Logger.debug('Hit', NewsService.name)

    const cacheKey = `${ticker}-news-${timeframe}`

    if (this.env.CACHE_ENABLED) {
      const cachedNewsAnalysis = await this.cacheManager.get<NewsAnalysisResult>(cacheKey)
      if (cachedNewsAnalysis) return cachedNewsAnalysis
    }

    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    let timeframeContext = ''

    switch (timeframe) {
      case 'short':
        timeframeContext = `
          STRATEGI: Trading Jangka Pendek / Day Trading (1 hari - 1 minggu).
          FOKUS UTAMA: Katalis instan, berita terhangat, sentimen harian, dan rumor pasar yang memicu volatilitas tinggi.
          - Prioritaskan berita yang rilis dalam 24-72 jam terakhir (misal: rilis laporan keuangan hari ini, aksi korporasi mendadak, pergantian direksi, atau berita regulasi instan).
          - Fokus pada dampak langsung terhadap pergerakan harga saham esok hari atau minggu ini.
          - Abaikan berita makroekonomi yang dampaknya baru terasa beberapa bulan lagi.
        `
        break
      case 'medium':
        timeframeContext = `
          STRATEGI: Swing Trading Jangka Menengah (2 minggu - 3 bulan).
          FOKUS UTAMA: Sentimen tren sektoral, rilis data bulanan, dan pengumuman korporasi berkala.
          - Cari perkembangan proyek berjalan, tren harga komoditas yang relevan dengan emiten, serta pengumuman rebalancing indeks global (MSCI, FTSE) yang akan efektif dalam beberapa minggu ke depan.
          - Analisis bagaimana berita tersebut memengaruhi prospek kinerja emiten untuk 1-2 kuartal ke depan.
        `
        break
      case 'long':
        timeframeContext = `
          STRATEGI: Investasi Jangka Panjang (di atas 6 bulan / Value Investing).
          FOKUS UTAMA: Kebijakan makroekonomi, regulasi pemerintah jangka panjang, rencana ekspansi multi-tahun, dan prospek industri global.
          - Soroti berita terkait investasi strategis baru, pembangunan pabrik/infrastruktur, isu tata kelola (ESG), atau perubahan lanskap industri yang mengubah fundamental emiten secara struktural.
          - Abaikan fluktuasi atau sentimen negatif harian jika tidak mengubah prospek bisnis jangka panjang perusahaan.
        `
        break
      default:
        timeframeContext = 'STRATEGI: Analisis umum seputar emiten terkait.'
    }

    const prompt = `
      Hari ini adalah ${today}. Gunakan ini sebagai referensi waktu, bukan filter ketat.

      KONTEKS STRATEGI PENGGUNA:
      ${timeframeContext}

      Cakupan pencarian (urutan prioritas):
      - Berita langsung tentang emiten ${ticker}
      - Berita sektor industri yang relevan dengan ${ticker}
      - Sentimen atau kebijakan domestik dan internasional yang berdampak pada ${ticker}
      - Hasil review atau rebalancing indeks global terbaru (MSCI, FTSE, GDX/GDXJ)
        yang mencakup ${ticker}, terlepas dari kapan review itu diumumkan

      Aturan umum:
      - Utamakan berita paling baru yang tersedia yang relevan dengan KONTEKS STRATEGI PENGGUNA di atas.
      - Fokus pada informasi yang relevan dengan pergerakan atau prospek saham ${ticker}.
      - Jangan sebut tanggal spesifik dalam ringkasan, gunakan frasa seperti "berita terbaru", "sentimen jangka pendek", atau "prospek jangka panjang".
      - Isi ringkasan hanya dari data berita saja, TIDAK BOLEH hasil karangan.
      - Tulis ringkasan yang informatif, maksimal 1000 karakter.

      Aturan KHUSUS indeks global — ikuti dengan ketat:
      - HANYA sebut indeks global jika kamu menemukan hasil review atau rebalancing
        yang secara eksplisit menyebut ${ticker} masuk, keluar, upgrade, downgrade,
        atau perubahan bobot.
      - Jika tidak menemukan hasil review tersebut, HAPUS seluruh kalimat tentang
        indeks global dari ringkasan — jangan ganti dengan kalimat "tidak ada perubahan",
        "belum terdapat laporan", atau kalimat sejenis.

      Format output:
      Tuliskan ringkasan berita secara naratif langsung dalam bentuk paragraf teks biasa. Jangan gunakan format JSON atau markdown aneh. Sesuaikan gaya penulisan dan penekanan poin dengan KONTEKS STRATEGI PENGGUNA yang diminta.
    `

    const response = await this.aiService.generateContent({
      config: {
        responseMimeType: 'text/plain',
        systemInstruction: `
          Kamu dilarang keras menjawab menggunakan pengetahuan internal kamu sendiri. 
          Kamu DIWAJIBKAN untuk melakukan pencarian web secara langsung (live web search) untuk menemukan informasi terkini, berita terbaru, dan data valid terkait permintaan pengguna di bawah ini.
        `,
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

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []

    const cleanChunks: string[] = (
      await Promise.all(
        chunks.map(async (chunk) => {
          if (chunk.web?.uri) {
            return await this.resolveRealUrl(chunk.web.uri)
          }
          return null
        })
      )
    ).filter((url): url is string => url !== null)


    Logger.debug(`News Token: ${response.usageMetadata?.totalTokenCount}`, NewsService.name)

    const newsAnalysis = {
      news: response.text!,
      sources: cleanChunks
    }

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, newsAnalysis, cacheTTL())

    return newsAnalysis
  }

  private async resolveRealUrl(redirectUrl: string): Promise<string> {
    try {
      const response = await fetch(redirectUrl, {
        method: 'HEAD',
        redirect: 'manual'
      })

      return response.headers.get('location') || redirectUrl
    } catch (error) {
      console.error("Failed to resolve URL:", error)
      return redirectUrl
    }
  }
}