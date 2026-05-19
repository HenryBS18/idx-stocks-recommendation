
import { BrokerAnalysis } from '@app/types'
import { getCsv, parseJson } from '@app/utils'
import { Injectable } from '@nestjs/common'
import { AiService } from './ai.service'

@Injectable()
export class BrokerService {
  constructor(private readonly aiService: AiService) { }

  async getBroker(ticker: string): Promise<BrokerAnalysis> {
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

    return parseJson<BrokerAnalysis>(response.text!)
  }
}