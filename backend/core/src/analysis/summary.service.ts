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
          FOKUS PENILAIAN: Keputusan harus berpusat pada **Momentum Teknikal**, **Aktivitas Broker Harian**, dan **Katalis Berita Instan**.
          - Fundamental hanya relevan sebagai jaring pengaman (pastikan tidak ada risiko bangkrut mendadak).
          - Jika teknikal sedang jelek/sideways dan broker distribusi, berikan rekomendasi "Avoid" meskipun fundamentalnya bagus (karena tidak cocok untuk fast-trade).
        `
        break
      case 'medium':
        strategyContext = `
          KONTEKS STRATEGI: Swing Trading Jangka Menengah (2 minggu - 3 bulan).
          FOKUS PENILAIAN: Keputusan berpusat pada **Tren Teknikal Menengah**, **Konsistensi Akumulasi Broker**, dan **Pertumbuhan Fundamental Kuartalan**.
          - Pertimbangkan apakah katalis berita sektoral mendukung tren naik selama beberapa minggu ke depan.
          - Jika struktur harga membentuk tren naik (higher high/higher low) yang divalidasi oleh akumulasi broker, ini adalah indikasi "Buy".
        `
        break
      case 'long':
        strategyContext = `
          KONTEKS STRATEGI: Investasi Jangka Panjang (di atas 6 bulan).
          FOKUS PENILAIAN: Keputusan WAJIB dipandu oleh **Kekuatan Fundamental (Valuasi & Profitabilitas)**, **Prospek Makro**, dan **Posisi Harga Historis (Teknikal Makro)**.
          - Abaikan volatilitas harga harian atau sentimen negatif sesaat dari berita/broker jika bisnis intinya tetap solid.
          - Jika saham ini secara fundamental undervalued (murah) dan berada di area support kuat jangka panjang, ini adalah indikasi "Buy" yang kuat untuk di-hold.
        `
        break
      default:
        strategyContext = 'KONTEKS STRATEGI: Analisis Umum.'
    }

    const prompt = `
      Kamu diberikan data ringkasan dari 4 pilar analisis untuk saham ${ticker} berikut ini:
      - Ringkasan Analisis Teknikal
      - Ringkasan Analisis Fundamental
      - Ringkasan Analisis Broker Summary (Bandarmologi)
      - Ringkasan Analisis Berita & Sentimen

      ${strategyContext}

      TUGAS:
      - Baca dan pahami semua data dari 4 pilar di atas secara menyeluruh.
      - Buat kesimpulan akhir yang mensintesis keempat aspek tersebut, KHUSUS UNTUK KONTEKS STRATEGI yang diminta.
      - Tentukan rekomendasi akhir secara tegas.
      
      ATURAN KESIMPULAN:
      - Sebutkan faktor mana yang paling dominan mempengaruhi keputusanmu.
      - Jika ada konflik data (Misalnya: Valuasi fundamental murah, tapi teknikal dan broker sedang distribusi hancur-hancuran), jelaskan risikonya secara singkat.
      - Di akhir paragraf kesimpulan, jelaskan rasionalisasi mengapa rekomendasinya "Buy" atau "Avoid" berdasar kacamata timeframe ini.
      - Gunakan kalimat yang ringkas, objektif, dan mudah dimengerti oleh investor awam.
      
      ATURAN REKOMENDASI:
      - "Buy"   → Jika mayoritas indikator mendukung dan risiko terukur sesuai timeframe yang dipilih.
      - "Avoid" → Jika mayoritas indikator negatif, tidak ada momentum, atau rasio risk/reward terlalu buruk untuk timeframe yang dipilih.

      Format output WAJIB JSON:
      {
        "summary": "kesimpulan komprehensif di sini",
        "recommendation": "Buy|Avoid"
      }
    `

    const response = await this.aiService.generateContent({
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