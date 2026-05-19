import { CACHE_TTL } from '@app/constants'
import { FundamentalAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AiService } from './ai.service'

@Injectable()
export class FundamentalService {
  private readonly cacheEnabled: boolean

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.getOrThrow<string>('CACHE_ENABLED') === 'true'
  }

  async getFundamental(ticker: string): Promise<FundamentalAnalysis> {
    const cacheKey = `${ticker}-fundamental`

    if (this.cacheEnabled) {
      const cachedFundamentalAnalysis = await this.cacheManager.get<FundamentalAnalysis>(cacheKey)
      if (cachedFundamentalAnalysis) return cachedFundamentalAnalysis
    }

    const prompt = `
			Analisis laporan keuangan, neraca keuangan, dan berita berikut.

			Tugas:
			- Ringkas laporan keuangan
			- Ringkas neraca keuangan

			Aturan laporan keuangan:
			- Jika data tidak tersedia maka output "Data fundamental tidak tersedia saat ini"

			Aturan neraca keuangan:
			- jika data tidak tersedia maka output ""

			Format output:
			{
				"financials": "ringkasan laporan keuangan",
				"balanceSheet": "ringkasan neraca keuangan"
			}
		`

    const financialsFilePath = await getCsv(ticker, 'financials')
    const balanceSheetFilePath = await getCsv(ticker, 'balance-sheet')

    const financialsUploadedFile = await this.aiService.upload({
      file: financialsFilePath,
      config: {
        mimeType: 'text/csv',
      },
    })

    const balanceSheetUploadedFile = await this.aiService.upload({
      file: balanceSheetFilePath,
      config: {
        mimeType: 'text/csv',
      },
    })

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

    if (this.cacheEnabled) await this.cacheManager.set(cacheKey, fundamentalAnalysis, CACHE_TTL)

    return fundamentalAnalysis
  }
}