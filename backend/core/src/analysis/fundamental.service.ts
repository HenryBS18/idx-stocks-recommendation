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

      Catatan Penting Data:
      Kolom "Pendapatan Bunga" dan "Beban Bunga" khusus untuk emiten sektor perbankan. Jika data pada kolom tersebut kosong, null, atau strip (-), maka emiten bukan bank. Abaikan analisis metrik bunga untuk emiten non-bank.

      Nama Kolom Laporan Keuangan (Financials):
      Periode, Total Pendapatan, Laba Sebelum Pajak, Pendapatan Bunga, Beban Bunga, Laba Bersih, Laba Operasional, Beban Operasional, EPS, PER, EBITDA, ROA, ROE, NPM, OPM

      Nama Kolom Neraca Keuangan (Balance Sheet):
      Periode, Saldo Laba, Total Aset, Total Liabilitas, Total Ekuitas, PBV, Kas dan Setara Kas, DER

      KONTEKS STRATEGI PENGGUNA:
      ${timeframeContext}

      TUGAS ANDA:
      1. Pada properti "financials": Mulai dari performa Bottom-Line (pertumbuhan Laba Bersih dan ketebalan margin NPM) lalu telusuri sumbernya di Top-Line (Total Pendapatan). Analisis efisiensi biaya (Beban Operasional, serta Beban Bunga khusus bank), profitabilitas operasional (Laba Operasional, OPM, EBITDA), dan metrik efisiensi/valuasi pasar (EPS, PER, ROA, ROE). Khusus emiten bank, soroti performa Pendapatan Bunga.
      2. Pada properti "balanceSheet": Analisis akumulasi kekayaan historis atau defisit perusahaan melalui Saldo Laba terlebih dahulu. Evaluasi proporsi Total Aset, lalu bedah kesehatan struktur modal serta risiko solvabilitasnya (Total Liabilitas vs Total Ekuitas). Analisis tingkat keamanan likuiditas dari Kas dan Setara Kas, serta tutup dengan penilaian nilai wajar harga saham berdasarkan rasio PBV dan tingkat leverage keuangan pada DER.
      3. Jangan sebut angka mentah yang terlalu panjang — gunakan deskripsi naratif, rasio relatif, atau persentase (misal: "laba bersih melonjak 15%", "NPM menebal", "risiko utang membengkak").
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