import { FundamentalAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { cacheTTL } from '@app/utils/cache-ttl'
import { File } from '@google/genai'
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
      Data berikut adalah laporan keuangan (financials) dan neraca keuangan (balance sheet) kuartalan selama 4-5 kuartal terakhir.

      Nama Kolom Laporan Keuangan (Financials):
      date, NPM, OPM, Pendapatan Total, Laba Operasional, EBITDA, Laba Bersih, Laba Sebelum Pajak, Penyisihan Pajak, Beban Operasional, Beban Bunga, Pendapatan Bunga

      Nama Kolom Neraca Keuangan (Balance Sheet):
      date, EPS, PER, PBV, ROE, DER, Total Aset, Kas dan Setara Kas, Piutang Usaha, Aset Tetap Bersih, Goodwill dan Aset Takberwujud, Total Liabilitas, Total Utang Berbunga, Utang Usaha, Total Ekuitas, Saldo Laba

      Tugas:
      - Analisis tren laporan keuangan antar kuartal (Pendapatan, profitabilitas, efisiensi beban)
      - Analisis kesehatan neraca keuangan (likuiditas, solvabilitas, struktur modal)
      - Interpretasikan rasio keuangan kunci yang sudah tersedia di dalam data

      Aturan analisis laporan keuangan (Financials):
      - Bandingkan tren Pendapatan Total, Laba Operasional, EBITDA, dan Laba Bersih antar kuartal.
      - Analisis tren margin profitabilitas menggunakan kolom NPM dan OPM yang sudah tersedia (apakah membaik, memburuk, atau stabil).
      - Perhatikan dampak dari Beban Operasional, Beban Bunga, atau Pendapatan Bunga terhadap profitabilitas inti perusahaan.

      Aturan analisis neraca keuangan (Balance Sheet):
      - Analisis tren pertumbuhan EPS (Earning Per Share) dari kuartal ke kuartal.
      - Nilai tingkat utang dan struktur modal menggunakan rasio DER (Debt-to-Equity Ratio) yang tersedia. Sebutkan apakah struktur modal tergolong konservatif, moderat, atau agresif.
      - Bandingkan posisi Kas dan Setara Kas vs Total Utang Berbunga untuk menilai likuiditas jangka pendek dan risiko gagal bayar.
      - Perhatikan tren Saldo Laba sebagai indikator profitabilitas historis yang diakumulasikan.
      - Berikan pandangan singkat mengenai valuasi saham saat ini berdasarkan angka PER dan PBV yang tersedia.

      Aturan fallback:
      - Jika laporan keuangan tidak tersedia atau kosong: "financials": "Data laporan keuangan tidak tersedia saat ini"
      - Jika neraca keuangan tidak tersedia atau kosong: "balanceSheet": "Data neraca keuangan tidak tersedia saat ini"

      Aturan ringkasan:
      - Gunakan Bahasa Indonesia yang mudah dipahami oleh investor.
      - Jangan sebut angka mentah yang terlalu panjang — gunakan deskripsi relatif (meningkat X%, margin sehat, valuasi premium/murah, dll).

      Format output wajib JSON:
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
      let financialsUploadedFile: File | undefined
      let balanceSheetUploadedFile: File | undefined

      if (financialsFilePath !== 'Data belum tersedia') {
        financialsUploadedFile = await this.aiService.upload({
          file: financialsFilePath,
          config: {
            mimeType: 'text/csv',
          },
        })
      }

      if (balanceSheetFilePath !== 'Data belum tersedia') {
        balanceSheetUploadedFile = await this.aiService.upload({
          file: balanceSheetFilePath,
          config: {
            mimeType: 'text/csv',
          },
        })
      }

      const response = await this.aiService.generateContent({
        contents: [
          financialsUploadedFile
            ? {
              fileData: {
                displayName: financialsUploadedFile.displayName,
                fileUri: financialsUploadedFile.uri,
                mimeType: financialsUploadedFile.mimeType,
              },
            }
            : {
              text: 'Data laporan keuangan belum tersedia',
            },
          balanceSheetUploadedFile
            ? {
              fileData: {
                displayName: balanceSheetUploadedFile.displayName,
                fileUri: balanceSheetUploadedFile.uri,
                mimeType: balanceSheetUploadedFile.mimeType,
              },
            }
            : {
              text: 'Data neraca keuangan belum tersedia',
            },
          {
            text: prompt,
          },
        ],
      })

      Logger.debug(`Fundamental Token: ${response.usageMetadata?.totalTokenCount}`, FundamentalService.name)

      const fundamentalAnalysis = parseJson<FundamentalAnalysis>(response.text!)

      if (this.env.CACHE_ENABLED) await this.cacheManager.set(cacheKey, fundamentalAnalysis, cacheTTL())

      return fundamentalAnalysis
    } finally {
      await Promise.allSettled([
        financialsFilePath !== 'Data belum tersedia'
          ? unlink(financialsFilePath)
          : Promise.resolve(),

        balanceSheetFilePath !== 'Data belum tersedia'
          ? unlink(balanceSheetFilePath)
          : Promise.resolve(),
      ])
    }
  }
}