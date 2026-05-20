import { CACHE_TTL } from '@app/constants'
import { FundamentalAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { AiService } from 'src/ai/ai.service'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class FundamentalService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly env: EnvService,
  ) { }

  async getAnalysis(ticker: string): Promise<FundamentalAnalysis> {
    Logger.debug('Hit', FundamentalService.name)

    const cacheKey = `${ticker}-fundamental`

    if (this.env.CACHE_ENABLED) {
      const cachedFundamentalAnalysis = await this.cacheManager.get<FundamentalAnalysis>(cacheKey)
      if (cachedFundamentalAnalysis) return cachedFundamentalAnalysis
    }

    const prompt = `
			Analisis laporan keuangan, neraca keuangan, dan berita berikut.

			Tugas:
			- Ringkas laporan keuangan
			- Ringkas neraca keuangan

			Aturan laporan keuangan:
			- Jika data tidak tersedia maka output "financials": "Data fundamental tidak tersedia saat ini"

			Aturan neraca keuangan:
			- jika data tidak tersedia maka output "balanceSheet": ""

			Format output:
			{
				"financials": "ringkasan laporan keuangan",
				"balanceSheet": "ringkasan neraca keuangan"
			}
		`

    const [financialsFilePath, balanceSheetFilePath] = await Promise.all([
      getCsv(ticker, 'financials'),
      getCsv(ticker, 'balance-sheet')
    ])

    try {
      const [financialsUploadedFile, balanceSheetUploadedFile] = await Promise.all([
        this.aiService.upload({
          file: financialsFilePath,
          config: {
            mimeType: 'text/csv',
          },
        }),
        this.aiService.upload({
          file: balanceSheetFilePath,
          config: {
            mimeType: 'text/csv',
          },
        })
      ])

      const response = await this.aiService.generateContent({
        contents: [
          {
            fileData: {
              displayName: financialsUploadedFile.displayName,
              fileUri: financialsUploadedFile.uri,
              mimeType: financialsUploadedFile.mimeType,
            },
          },
          {
            fileData: {
              displayName: balanceSheetUploadedFile.displayName,
              fileUri: balanceSheetUploadedFile.uri,
              mimeType: balanceSheetUploadedFile.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      })

      const fundamentalAnalysis = parseJson<FundamentalAnalysis>(response.text!)

      if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, fundamentalAnalysis, CACHE_TTL)

      return fundamentalAnalysis
    } finally {
      await Promise.allSettled([
        unlink(financialsFilePath),
        unlink(balanceSheetFilePath)
      ])
    }
  }
}