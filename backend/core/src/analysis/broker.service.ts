import { BrokerAnalysis, Timeframe } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { cacheTTL } from '@app/utils/cache-ttl'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { AiService } from 'src/ai/ai.service'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class BrokerService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly env: EnvService,
  ) { }

  async getAnalysis(ticker: string, timeframe: Timeframe): Promise<BrokerAnalysis> {
    Logger.debug('Hit', BrokerService.name)

    const cacheKey = `${ticker}-broker-${timeframe}`

    if (this.env.CACHE_ENABLED) {
      const cachedBrokerAnalysis = await this.cacheManager.get<BrokerAnalysis>(cacheKey)
      if (cachedBrokerAnalysis) return cachedBrokerAnalysis
    }

    let dataPeriod = ''
    let timeframeContext = ''

    switch (timeframe) {
      case 'short':
        dataPeriod = '3 hari terakhir'
        timeframeContext = 'Fokus pada momentum jangka pendek (1 hari - 1 minggu). Cari tahu apakah ada broker yang melakukan akumulasi agresif secara instan atau sedang "buang barang" (distribusi) secara masif. Ini ditujukan untuk trader harian/day trader.'
        break
      case 'medium':
        dataPeriod = '3 bulan terakhir'
        timeframeContext = 'Fokus pada tren jangka menengah (2 minggu - 3 bulan). Deteksi apakah terjadi "silent accumulation" (bandar mencicil barang) atau distribusi berkelanjutan yang membentuk arah tren (swing trading).'
        break
      case 'long':
        dataPeriod = '6 bulan terakhir'
        timeframeContext = 'Fokus pada tren jangka panjang (di atas 6 bulan). Analisis pergerakan dana besar secara makro (apakah asing terus mengumpulkan barang?). Berikan catatan kecil di akhir bahwa untuk investasi jangka panjang, fundamental tetap lebih utama dibandingkan bandarmologi.'
        break
      default:
        dataPeriod = 'periode ini'
        timeframeContext = 'Fokus pada tren umum.'
    }

    const systemInstruction = `
      Anda adalah seorang analis market microstructure dan pakar Bandarmologi di Bursa Efek Indonesia (BEI). Tugas Anda adalah membedah data Broker Summary (dari file CSV yang dilampirkan) menjadi narasi analisis yang tajam namun ramah bagi investor pemula.

      PANDUAN ANALISIS DATA:
      - Bandingkan total buy_value vs total sell_value untuk menentukan siapa yang mengendalikan harga.
      - Fokus hanya pada 3-5 broker paling aktif di sisi beli (Buy Side) dan jual (Sell Side), abaikan yang nilainya kecil.
      - Klasifikasikan tipe broker berdasarkan kode berikut:
        * Asing (Foreign Flow): AK, BK, ZP, RX, YU, CC, KZ, CS
        * Institusi/Dana Besar: LG, PD, BB, AZ, OD, DX, HP, KI, NI, RB, SQ, RF
        * Ritel Domestik: XL, XC, PD, YP
      - Perhatikan rata-rata harga (buy_avg vs sell_avg). Jika buy_avg > sell_avg, tandanya ada aksi beli agresif (hajar kanan).

      PANDUAN EDUKASI INVESTOR PEMULA:
      - Setiap kali Anda menggunakan istilah teknikal Bandarmologi (seperti akumulasi, distribusi, foreign inflow, atau hajar kanan), Anda WAJIB memberikan penjelasan singkat atau analogi sederhana di dalam tanda kurung. (Contoh: "terjadi distribusi (aksi bandar/institusi besar menjual saham ke investor ritel)...").

      ATURAN FORMAT OUTPUT (JSON & HTML TAILWIND):
      1. Output harus berupa JSON murni yang valid sesuai schema dengan key "brokerSummary". JANGAN gunakan backticks (\`\`\`json ... \`\`\`).
      2. Di dalam string "brokerSummary", gunakan teks paragraf mengalir yang disisipi tag HTML <span> untuk mewarnai kata kunci penting.
      3. WAJIB menggunakan tanda kutip satu (') untuk class Tailwind di dalam tag HTML (Contoh: class='text-emerald-400'). JANGAN PERNAH gunakan kutip dua (\") di dalam tag HTML karena akan merusak format parsing JSON!
      4. Skema Warna Class Tailwind:
        * Kondisi Akumulasi / Bullish / Belanja Agresif: <span class='text-emerald-400 font-semibold'>Kata/Kalimat</span>
        * Kondisi Distribusi / Bearish / Ritel Terjebak: <span class='text-rose-400 font-semibold'>Kata/Kalimat</span>
        * Kondisi Netral / Konsolidasi / Sideways: <span class='text-amber-400 font-semibold'>Kata/Kalimat</span>
        * Penyebutan Kode Broker (misal: AK, BK, YP): <span class='text-sky-400 font-medium'>KODE</span>
    `

    const prompt = `
      Analisis data aktivitas broker (Broker Summary) pada file CSV yang terlampir untuk saham ${ticker} selama periode ${dataPeriod}.
      
      KONTEKS STRATEGI PENGGUNA:
      ${timeframeContext}
      
      TUGAS ANDA:
      1. Identifikasi broker yang paling dominan di sisi buy dan sell berdasarkan aturan klasifikasi tipe broker.
      2. Tentukan status dominasi akhir (Akumulasi/Distribusi/Netral) secara keseluruhan.
      3. Berikan deskripsi relatif (seperti "signifikan", "dominan", "moderat") dan sebutkan implikasinya terhadap arah pergerakan harga saham ${ticker} ke depan.
      4. Sesuaikan penekanan poin dan gaya bahasa dengan KONTEKS STRATEGI PENGGUNA di atas.
    `

    const responseJsonSchema = {
      "type": "object",
      "properties": {
        "brokerSummary": {
          "type": "string"
        }
      },
      "propertyOrdering": [
        "brokerSummary"
      ],
      "required": [
        "brokerSummary"
      ]
    }

    const brokerSummaryFilePath = await getCsv(ticker, 'broker-summary', timeframe)

    try {
      const brokerSummaryUploadedFile = await this.aiService.upload({
        file: brokerSummaryFilePath,
        config: {
          mimeType: 'text/csv',
        },
      })

      const response = await this.aiService.generateContent({
        config: {
          systemInstruction,
          responseJsonSchema,
        },
        contents: [
          {
            fileData: {
              displayName: brokerSummaryUploadedFile.displayName,
              fileUri: brokerSummaryUploadedFile.uri,
              mimeType: brokerSummaryUploadedFile.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      })

      Logger.debug(`Broker Token: ${response.usageMetadata?.totalTokenCount}`, BrokerService.name)

      const brokerAnalysis = parseJson<BrokerAnalysis>(response.text!)

      if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, brokerAnalysis, cacheTTL())

      return brokerAnalysis
    } finally {
      await unlink(brokerSummaryFilePath)
    }
  }
}