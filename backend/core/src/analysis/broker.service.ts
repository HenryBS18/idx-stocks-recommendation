
import { CACHE_TTL } from '@app/constants'
import { BrokerAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
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

  async getAnalysis(ticker: string): Promise<BrokerAnalysis> {
    Logger.debug('Hit', BrokerService.name)

    const cacheKey = `${ticker}-broker`

    if (this.env.CACHE_ENABLED) {
      const cachedBrokerAnalysis = await this.cacheManager.get<BrokerAnalysis>(cacheKey)
      if (cachedBrokerAnalysis) return cachedBrokerAnalysis
    }

    const prompt = `
      Data berikut adalah ringkasan aktivitas broker selama 3 bulan terakhir untuk saham ini.
      Kolom buy side: broker, lot, value, avg price.
      Kolom sell side: broker, lot, value, avg price.
			
      Tugas:
      - Identifikasi siapa broker paling dominan di sisi beli dan jual
      - Tentukan apakah terjadi akumulasi atau distribusi secara keseluruhan
      - Deteksi pola penting (misalnya: broker asing dominan beli, broker lokal dominan jual, atau sebaliknya)
      - Buat ringkasan yang mudah dipahami investor

      Aturan analisis:
      - Bandingkan total buy_value vs total sell_value untuk menentukan tekanan dominan
      - Asing umumnya menggunakan broker dengan kode: AK, BK, ZP, RX, YU, CC, KZ, CS — sebutkan jika ada dominasi asing
      - Institusi umumnya menggunakan broker dengan kode: LG, PD, BB, AZ, OD, DX, HP, KI, NI, RB, SQ, RF — sebutkan jika ada dominasi institusi
      - Ritel umumnya menggunakan broker dengan kode: XL, XC, PD, YP — sebutkan jika ada dominasi ritel
      - Perhatikan buy_avg vs sell_avg: jika buy_avg > sell_avg artinya ada yang beli di harga lebih tinggi (agresif beli)
      - Fokus pada 3-5 broker paling aktif saja, abaikan yang nilainya kecil

      Aturan ringkasan:
      - Wajib menyebutkan: dominasi arah (akumulasi/distribusi), broker paling aktif, dan implikasinya terhadap harga
      - Jangan sebutkan angka mentah, gunakan deskripsi relatif (misalnya "signifikan", "dominan", "moderat")

			Format output:
			{
				"brokerSummary": "ringkasan hasil analisis"
			}
		`

    const brokerSummaryFilePath = await getCsv(ticker, 'broker-summary')

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

      if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, brokerAnalysis, CACHE_TTL)

      return brokerAnalysis
    } finally {
      await unlink(brokerSummaryFilePath)
    }
  }
}