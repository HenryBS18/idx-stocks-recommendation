import { Injectable } from '@nestjs/common'
import { getCsv } from '@utils/get-csv'
import { AiService } from './ai.service'

@Injectable()
export class FundamentalService {
  constructor(private readonly aiService: AiService) { }

  async getFundamental(ticker: string): Promise<string> {
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

    return response.text!
  }
}