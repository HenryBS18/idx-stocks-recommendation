
import { CACHE_TTL } from '@app/constants'
import { BrokerAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { unlink } from 'fs/promises'
import { AiService } from './ai.service'

@Injectable()
export class BrokerService {
  private readonly cacheEnabled: boolean

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.getOrThrow<string>('CACHE_ENABLED') === 'true'
  }

  async getBroker(ticker: string): Promise<BrokerAnalysis> {
    Logger.debug('Hit', this.getBroker.name)

    const cacheKey = `${ticker}-broker`

    if (this.cacheEnabled) {
      const cachedBrokerAnalysis = await this.cacheManager.get<BrokerAnalysis>(cacheKey)
      if (cachedBrokerAnalysis) return cachedBrokerAnalysis
    }

    const prompt = `
      Analisis data broker summary berikut.
			
      Tugas:
      - Ringkas hasil analisis

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

      const brokerAnalysis = parseJson<BrokerAnalysis>(response.text!)

      if (this.cacheEnabled) await this.cacheManager.set(cacheKey, brokerAnalysis, CACHE_TTL)

      return brokerAnalysis
    } finally {
      await unlink(brokerSummaryFilePath)
    }
  }
}