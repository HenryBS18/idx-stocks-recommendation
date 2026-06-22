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

  async getAnalysis({ ticker, technical, broker, fundamental, news, timeframe }: GetSummaryParams): Promise<SummaryAnalysis> {
    Logger.debug('Hit', SummaryService.name)

    const cacheKey = `${ticker}-summary-${timeframe}`

    if (this.env.CACHE_ENABLED) {
      const cachedSummaryAnalysis = await this.cacheManager.get<SummaryAnalysis>(cacheKey)
      if (cachedSummaryAnalysis) return cachedSummaryAnalysis
    }

    let strategyContext = ''

    switch (timeframe) {
      case 'short':
        strategyContext = `
          KONTEKS STRATEGI: Trading Jangka Pendek / Day Trading (1 hari - 1 minggu).
          FOKUS PENILAIAN: Keputusan harus berpusat pada Momentum Teknikal, Aktivitas Broker Harian, dan Katalis Berita Instan.
          - Fundamental hanya relevan sebagai jaring pengaman (pastikan tidak ada risiko bangkrut mendadak).
          - Jika teknikal sedang jelek/sideways dan broker distribusi, berikan rekomendasi "Avoid" meskipun fundamentalnya bagus (karena tidak cocok untuk fast-trade).
        `
        break
      case 'medium':
        strategyContext = `
          KONTEKS STRATEGI: Swing Trading Jangka Menengah (2 minggu - 3 bulan).
          FOKUS PENILAIAN: Keputusan berpusat pada Tren Teknikal Menengah, Konsistensi Akumulasi Broker, dan Pertumbuhan Fundamental Kuartalan.
          - Pertimbangkan apakah katalis berita sektoral mendukung tren naik selama beberapa minggu ke depan.
          - Jika struktur harga membentuk tren naik (higher high/higher low) yang divalidasi oleh akumulasi broker, ini adalah indikasi "Buy".
        `
        break
      case 'long':
        strategyContext = `
          KONTEKS STRATEGI: Investasi Jangka Panjang (di atas 6 bulan).
          FOKUS PENILAIAN: Keputusan WAJIB dipandu oleh Kekuatan Fundamental (Valuasi & Profitabilitas), Prospek Makro, dan Posisi Harga Historis (Teknikal Makro).
          - Abaikan volatilitas harga harian atau sentimen negatif sesaat dari berita/broker jika bisnis intinya tetap solid.
          - Jika saham ini secara fundamental undervalued (murah) dan berada di area support kuat jangka panjang, ini adalah indikasi "Buy" yang kuat untuk di-hold.
        `
        break
      default:
        strategyContext = 'KONTEKS STRATEGI: Analisis Umum.'
    }

    const systemInstruction = `
      Anda adalah Ketua Komite Investasi dan Strategis Pasar Modal senior di Bursa Efek Indonesia (BEI). Tugas Anda adalah mengonstruksi ringkasan eksekutif (sintesis) dari 4 pilar analisis (Teknikal, Fundamental, Bandarmologi, Sentimen) menjadi satu kesimpulan komprehensif dan menetapkan rekomendasi akhir secara tegas.

      PANDUAN RESOLUSI KONFLIK DATA & EDUKASI PEMULA:
      - Jika ada konflik data (misalnya: Valuasi Fundamental sangat murah, tetapi Teknikal breakdown dan Bandarmologi mencatat Distribusi Masif), Anda wajib menjelaskan risikonya dengan bahasa sederhana.
      - Edukasi investor pemula jika terjadi kondisi dilematis seperti Value Trap (saham terlihat murah padahal kinerjanya memburuk terus) atau Bull Trap (harga naik sesaat padahal bandar sedang jualan masif) di dalam tanda kurung.

      ATURAN FORMAT OUTPUT (JSON & HTML TAILWIND):
      1. Output wajib berupa JSON murni yang valid sesuai schema dengan key "summary" dan "recommendation". JANGAN gunakan backticks (\`\`\`json ... \`\`\`).
      2. Nilai pada properti "recommendation" HARUS berupa string murni: "Buy" atau "Avoid" (pilih salah satu, tanpa tag HTML, tanpa modifikasi kata).
      3. Di dalam string penjelasan "summary", gunakan teks paragraf mengalir yang disisipi tag HTML <span> untuk mewarnai kesimpulan krusial.
      4. WAJIB menggunakan tanda kutip satu (') untuk class Tailwind di dalam tag HTML (Contoh: class='text-emerald-400'). JANGAN PERNAH gunakan kutip dua (\") di dalam tag HTML karena akan merusak struktur string JSON!
      5. Skema Warna Class Tailwind pada properti "summary":
        * Rekomendasi Positif / Sinyal Konfirmasi / Arah Akumulasi: <span class='text-emerald-400 font-semibold'>Kata/Kalimat</span>
        * Risiko Tinggi / Sinyal Bahaya / Konflik Data / Distribusi: <span class='text-rose-400 font-semibold'>Kata/Kalimat</span>
        * Sebutan 4 Pilar Analisis (Teknikal, Fundamental, Bandarmologi, Sentimen): <span class='text-sky-400 font-medium'>PILAR</span>
        * Kondisi Netral / Penyeimbang / Alternatif Wait & See: <span class='text-amber-400 font-semibold'>Kata/Kalimat</span>
    `

    const prompt = `
      Saham Target: ${ticker}

      KONTEKS STRATEGI PENGGUNA:
      ${strategyContext}

      TUGAS ANDA:
      1. Tinjau keempat pilar di atas secara silang. Cari tahu apakah datanya saling mendukung atau justru saling berbenturan berdasarkan KONTEKS STRATEGI pengguna.
      2. Tentukan faktor dominan yang mendasari keputusan Anda pada timeframe ini.
      3. Berikan rasionalisasi yang objektif dan kalkulatif mengapa keputusan akhirnya "Buy" atau "Avoid" pada properti "summary".
      4. Isi properti "recommendation" secara tegas sesuai dengan instruksi schema.
    `

    const responseJsonSchema = {
      "type": "object",
      "properties": {
        "summary": {
          "type": "string"
        },
        "recommendation": {
          "type": "string"
        }
      },
      "propertyOrdering": [
        "summary",
        "recommendation"
      ],
      "required": [
        "summary",
        "recommendation"
      ]
    }

    const response = await this.aiService.generateContent({
      config: {
        systemInstruction,
        responseJsonSchema,
      },
      contents: [
        {
          text: `[TEKNIKAL]: ${JSON.stringify(technical)}`
        },
        {
          text: `[BROKER]: ${JSON.stringify(broker)}`
        },
        {
          text: `[FUNDAMENTAL]: ${JSON.stringify(fundamental)}`
        },
        {
          text: `[BERITA]: ${JSON.stringify(news)}`
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