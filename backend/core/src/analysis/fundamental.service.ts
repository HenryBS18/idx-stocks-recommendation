import { FundamentalAnalysis, Timeframe } from '@app/types'
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

  async getAnalysis(ticker: string, timeframe: Timeframe): Promise<FundamentalAnalysis> {
    Logger.debug('Hit', FundamentalService.name)

    const cacheKey = `${ticker}-fundamental-${timeframe}`

    if (this.env.CACHE_ENABLED) {
      const cachedFundamentalAnalysis = await this.cacheManager.get<FundamentalAnalysis>(cacheKey)
      if (cachedFundamentalAnalysis) return cachedFundamentalAnalysis
    }

    let timeframeContext = ''

    switch (timeframe) {
      case 'short':
        timeframeContext = `
          SUDUT PANDANG: Trading Jangka Pendek / Day Trading (1 hari - 1 minggu).
          FOKUS UTAMA: Faktor keamanan (safety net) dan katalis instan. 
          - Investor jangka pendek hanya perlu tahu: Apakah perusahaan ini aman dari risiko gagal pasar/gagal bayar mendadak? 
          - Soroti posisi Likuiditas (Kas vs Utang Berbunga pendek) secara kilat.
          - Perhatikan apakah ada lonjakan EPS atau Laba Bersih mendadak di kuartal terakhir yang bisa memicu momentum kenaikan harga (earnings surprise).
          - Abaikan analisis valuasi historis yang terlalu mendalam.
        `
        break
      case 'medium':
        timeframeContext = `
          SUDUT PANDANG: Swing Trading Jangka Menengah (2 minggu - 3 bulan).
          FOKUS UTAMA: Tren pertumbuhan kuartalan (QoQ) dan stabilitas margin.
          - Analisis apakah Pendapatan Total dan Laba Bersih menunjukkan tren naik atau berbalik arah (turnaround) dalam 3 kuartal terakhir.
          - Perhatikan kesehatan rasio DER dan efisiensi beban (OPM/NPM) untuk memastikan perusahaan tidak mengalami pemburukan kinerja selama posisi trading sedang di-hold.
          - Berikan penilaian sekilas apakah harga saat ini (PER/PBV) wajar untuk target swing.
        `
        break
      case 'long':
        timeframeContext = `
          SUDUT PANDANG: Investasi Jangka Panjang (di atas 6 bulan / Value & Growth Investing).
          FOKUS UTAMA: Struktur modal, kekuatan bisnis inti, dan Valuasi.
          - Analisis secara komprehensif kekuatan finansial jangka panjang perusahaan.
          - Evaluasi konsistensi profitabilitas (ROE) dan akumulasi kekayaan melalui Saldo Laba.
          - Bedah struktur modal (DER) secara ketat apakah tergolong konservatif atau terlalu berisiko.
          - Berikan analisis mendalam mengenai Valuasi (PER dan PBV) saat ini dibandingkan dengan pertumbuhan kinerjanya. Berikan kesimpulan tegas apakah saham ini tergolong murah (undervalued), wajar (fair value), atau sudah kemahalan (overvalued).
        `
        break
      default:
        timeframeContext = 'SUDUT PANDANG: Analisis umum standar korporasi.'
    }

    const systemInstruction = `
      Anda adalah seorang analis ekuitas (Equity Analyst) senior dan ahli nilai intrinsik perusahaan di Bursa Efek Indonesia (BEI). Tugas Anda adalah membedah data laporan keuangan kuartalan menjadi narasi ringkas yang objektif, tajam, dan mudah dipahami oleh investor pemula.

      PANDUAN EDUKASI INVESTOR PEMULA:
      - Setiap kali Anda menyebutkan rasio keuangan atau metrik akuntansi akronim (seperti DER, PER, PBV, ROE, NPM, OPM, EBITDA), Anda WAJIB memberikan penjelasan singkat artinya di dalam tanda kurung agar pemula paham dampaknya. (Contoh: "Rasio utang atau DER perusahaan naik (artinya utang berbunga perusahaan semakin besar dibanding modalnya)...").

      ATURAN FORMAT OUTPUT (JSON & HTML TAILWIND):
      1. Output harus berupa JSON murni yang valid sesuai schema dengan key "financials" dan "balanceSheet". JANGAN gunakan backticks (\`\`\`json ... \`\`\`).
      2. Di dalam nilai string "financials" dan "balanceSheet", gunakan teks paragraf mengalir yang disisipi tag HTML <span> untuk melakukan highlight kata kunci penting.
      3. WAJIB menggunakan tanda kutip satu (') untuk class Tailwind di dalam tag HTML (Contoh: class='text-emerald-400'). JANGAN PERNAH gunakan kutip dua (\") di dalam tag HTML karena akan memutus string dan merusak format JSON!
      4. Skema Warna Class Tailwind:
        * Kondisi Sehat / Pertumbuhan / Murah (Undervalued, Laba Naik, Utang Aman): <span class='text-emerald-400 font-semibold'>Kata/Kalimat</span>
        * Kondisi Riskan / Penurunan / Mahal (Overvalued, Laba Turun, DER Tinggi): <span class='text-rose-400 font-semibold'>Kata/Kalimat</span>
        * Rasio & Metrik Finansial (PER, PBV, ROE, EPS, EBITDA, dll): <span class='text-sky-400 font-medium'>METRIK</span>
        * Kondisi Netral / Wajar (Fair Value, Sideways): <span class='text-amber-400 font-semibold'>Kata/Kalimat</span>

      ATURAN FALLBACK DATA:
      - Jika data laporan keuangan tidak tersedia atau kosong, isi value "financials": "Data laporan keuangan tidak tersedia saat ini"
      - Jika data neraca keuangan tidak tersedia atau kosong, isi value "balanceSheet": "Data neraca keuangan tidak tersedia saat ini"
    `

    const prompt = `
      Saham Target: ${ticker}

      Data berikut adalah laporan keuangan (financials) dan neraca keuangan (balance sheet) kuartalan selama 4-5 kuartal terakhir untuk saham ${ticker} yang terlampir pada file data.

      Nama Kolom Laporan Keuangan (Financials):
      date, NPM, OPM, Pendapatan Total, Laba Operasional, EBITDA, Laba Bersih, Laba Sebelum Pajak, Penyisihan Pajak, Beban Operasional, Beban Bunga, Pendapatan Bunga

      Nama Kolom Neraca Keuangan (Balance Sheet):
      date, EPS, PER, PBV, ROE, DER, Total Aset, Kas dan Setara Kas, Piutang Usaha, Aset Tetap Bersih, Goodwill dan Aset Takberwujud, Total Liabilitas, Total Utang Berbunga, Utang Usaha, Total Ekuitas, Saldo Laba

      KONTEKS STRATEGI PENGGUNA:
      ${timeframeContext}

      TUGAS ANDA:
      1. Pada properti "financials": Analisis tren per kuartal (Pendapatan, profitabilitas margin NPM/OPM, serta efisiensi beban operasional/bunga).
      2. Pada properti "balanceSheet": Analisis tren pertumbuhan EPS, kesehatan struktur modal (DER), likuiditas jangka pendek (Kas vs Utang Berbunga), akumulasi kekayaan (Saldo Laba), dan penilaian valuasi (PER/PBV).
      3. Jangan sebut angka mentah yang terlalu panjang — gunakan deskripsi relatif atau persentase (misal: "meningkat 15%", "margin menebal").
      4. Sesuaikan bobot detail, penekanan analisis, dan gaya bahasa dengan KONTEKS STRATEGI PENGGUNA di atas.
    `

    const responseJsonSchema = {
      "type": "object",
      "properties": {
        "financials": {
          "type": "string"
        },
        "balanceSheet": {
          "type": "string"
        }
      },
      "propertyOrdering": [
        "financials",
        "balanceSheet"
      ],
      "required": [
        "financials",
        "balanceSheet"
      ]
    }

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
        config: {
          systemInstruction,
          responseJsonSchema,
        },
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