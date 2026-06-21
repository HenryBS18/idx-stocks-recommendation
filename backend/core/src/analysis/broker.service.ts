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
        dataPeriod = '7 hari terakhir'
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

    const prompt = `
      Data berikut adalah ringkasan aktivitas broker (Broker Summary) selama ${dataPeriod} untuk saham ${ticker}.
      Kolom buy side: broker, lot, value, avg price.
      Kolom sell side: broker, lot, value, avg price.
      
      KONTEKS ANALISIS:
      ${timeframeContext}
      
      TUGAS UTAMA:
      - Identifikasi siapa broker paling dominan di sisi beli dan jual
      - Tentukan apakah terjadi akumulasi atau distribusi secara keseluruhan
      - Deteksi pola penting (misalnya: broker asing dominan beli, broker lokal dominan jual, atau sebaliknya)
      - Buat ringkasan yang mudah dipahami oleh pengguna dengan target waktu tersebut.

      ATURAN ANALISIS:
      - Bandingkan total buy_value vs total sell_value untuk menentukan tekanan dominan
      - Asing umumnya menggunakan broker dengan kode: AK, BK, ZP, RX, YU, CC, KZ, CS — sebutkan jika ada dominasi asing
      - Institusi umumnya menggunakan broker: LG, PD, BB, AZ, OD, DX, HP, KI, NI, RB, SQ, RF — sebutkan jika dominan
      - Ritel umumnya menggunakan broker: XL, XC, PD, YP — sebutkan jika ada dominasi ritel
      - Perhatikan buy_avg vs sell_avg: jika buy_avg > sell_avg artinya ada yang beli di harga lebih tinggi (agresif beli)
      - Fokus pada 3-5 broker paling aktif saja, abaikan yang nilainya kecil

      ATURAN RINGKASAN:
      - Wajib menyebutkan: dominasi arah (akumulasi/distribusi), broker paling aktif, dan implikasinya terhadap harga di periode ${dataPeriod}.
      - Boleh sebutkan angka mentah, namun diikuti deskripsi relatif (misalnya "signifikan", "dominan", "moderat")
      - Sesuaikan gaya bahasa dan penekanan dengan KONTEKS ANALISIS di atas.

      Format output JSON:
      {
        "brokerSummary": "ringkasan hasil analisis"
      }
    `

    const brokerSummaryFilePath = await getCsv(ticker, 'broker-summary', timeframe)

    try {
      const brokerSummaryUploadedFile = await this.aiService.upload({
        file: brokerSummaryFilePath,
        config: {
          mimeType: 'text/csv',
        },
      })

      const response = await this.aiService.generateContent({
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