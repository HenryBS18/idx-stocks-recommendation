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
			Data berikut adalah laporan keuangan dan neraca keuangan kuartalan selama 4-5 kuartal terakhir.

			Tugas:
			- Analisis tren laporan keuangan antar kuartal (revenue, profitabilitas, beban)
      - Analisis kesehatan neraca keuangan (likuiditas, solvabilitas, struktur modal)
      - Hitung rasio keuangan kunci dari data yang tersedia

			Aturan analisis laporan keuangan:
      - Bandingkan tren Revenue, GrossProfit, OperatingIncome, dan NetIncome antar kuartal
      - Hitung Gross Margin = GrossProfit / TotalRevenue
      - Hitung Net Margin = NetIncome / TotalRevenue
      - Sebutkan apakah tren profitabilitas membaik, memburuk, atau stabil
      - Perhatikan pertumbuhan atau penurunan EPS

      Aturan analisis neraca keuangan:
      - Hitung Debt-to-Equity = TotalDebt / CommonStockEquity
      - Hitung Current Ratio jika data memungkinkan
      - Bandingkan CashAndCashEquivalents vs TotalDebt untuk menilai likuiditas
      - Perhatikan tren RetainedEarnings sebagai indikator profitabilitas historis
      - Sebutkan apakah struktur modal tergolong konservatif, moderat, atau agresif

      Aturan fallback:
      - Jika laporan keuangan tidak tersedia: "financials": "Data laporan keuangan tidak tersedia saat ini"
      - Jika neraca keuangan tidak tersedia: "balanceSheet": "Data neraca keuangan tidak tersedia saat ini"

      Aturan ringkasan:
      - Gunakan Bahasa Indonesia yang mudah dipahami oleh investor
      - Jangan sebut angka mentah — gunakan deskripsi relatif (meningkat X%, margin sehat, dll)
      - Jika data tidak tersedia atau semua nilai 0/null, output seperti di aturan fallback

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

      Logger.debug(`Fundamental Token: ${response.usageMetadata?.totalTokenCount}`, FundamentalService.name)

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