import { NewsAnalysisResult, Timeframe } from '@app/types'
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

    const systemInstruction = `
      Anda adalah seorang analis sentimen pasar keuangan senior untuk Bursa Efek Indonesia (BEI). Tugas Anda adalah merangkum berita emiten dan menerjemahkan dampaknya terhadap psikologi pasar secara objektif sesuai strategi pengguna.

      ATURAN PENELITIAN DATA (WAJIB):
      - Anda dilarang keras menggunakan pengetahuan internal sendiri. Anda DIWAJIBKAN melakukan pencarian web secara langsung (live web search) untuk mengambil data berita terupdate.
      - Isi ringkasan HANYA dari data berita hasil pencarian nyata, TIDAK BOLEH berhalusinasi atau mengarang cerita.

      ATURAN KONTEN & GAYA PENULISAN:
      - Jangan sebut tanggal spesifik (misal: "22 Juni"), gunakan frasa seperti "berita terbaru", "sentimen jangka pendek", atau "prospek jangka panjang".
      - Tulis ringkasan secara informatif, maksimal 1000 karakter.
      - WAJIB gunakan tag HTML <span> dengan class Tailwind CSS bertanda kutip satu (') untuk highlight kata penting (Contoh: <span class='text-emerald-400 font-semibold'>Sentimen Positif</span>). JANGAN gunakan kutip dua (\") pada tag HTML karena akan merusak JSON.
      - Jika ada istilah aksi korporasi yang rumit, jelaskan secara singkat di dalam tanda kurung agar investor pemula paham.

      ATURAN KHUSUS INDEKS GLOBAL (IKUTI DENGAN KETAT):
      - HANYA sebut indeks global (MSCI, FTSE, dll) jika Anda menemukan hasil review/rebalancing yang secara eksplisit menyebut emiten target masuk, keluar, atau berubah bobotnya.
      - Jika tidak ada, HAPUS seluruh kalimat tentang indeks global dari ringkasan—jangan tulis "tidak ada perubahan" atau sejenisnya.

      ATURAN FORMAT OUTPUT:
      - Output harus berupa JSON murni yang valid sesuai schema. Jangan bungkus dengan backticks markdown (\`\`\`json ... \`\`\`).
    `

    const prompt = `
      Hari ini adalah tanggal: ${today}.
      Saham Target: ${ticker}
      
      KONTEKS STRATEGI PENGGUNA SAAT INI:
      ${timeframeContext}

      Cakupan pencarian berita (Urutan Prioritas):
      1. Berita langsung tentang emiten ${ticker}
      2. Berita sektor industri yang relevan dengan ${ticker}
      3. Sentimen kebijakan domestik/internasional yang berdampak pada ${ticker}
      4. Hasil review/rebalancing indeks global terbaru yang mencakup ${ticker}

      Eksekusi pencarian sekarang, lalu isi properti "news" dan "sources" pada JSON.
    `

    const responseJsonSchema = {
      "type": "object",
      "properties": {
        "news": {
          "type": "string"
        },
        "sources": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "propertyOrdering": [
        "news",
        "sources"
      ],
      "required": [
        "news",
        "sources"
      ]
    }

    const response = await this.aiService.generateContent({
      config: {
        systemInstruction,
        responseJsonSchema,
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

    const newsAnalysisTmp = parseJson<NewsAnalysisResult>(response.text!)

    const cleanSources: string[] = (
      await Promise.all(
        newsAnalysisTmp.sources.map(async (url) => {
          if (url) {
            return await this.resolveRealUrl(url)
          }
          return null
        })
      )
    ).filter((url): url is string => url !== null)

    const newsAnalysis = {
      news: newsAnalysisTmp.news,
      sources: cleanSources
    }

    if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, newsAnalysis, cacheTTL())

    return newsAnalysis
  }

  private async resolveRealUrl(redirectUrl: string): Promise<string> {
    const response = await fetch(redirectUrl, {
      method: 'HEAD',
      redirect: 'manual'
    })

    return response.headers.get('location') || redirectUrl
  }
}