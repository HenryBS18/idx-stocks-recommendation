import { NewsAnalysis } from '@app/types'
import { parseJson } from '@app/utils'
import { Injectable } from '@nestjs/common'
import { AiService } from './ai.service'

@Injectable()
export class NewsService {
  constructor(private readonly aiService: AiService) { }

  async getNews(ticker: string): Promise<NewsAnalysis> {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const prompt = `
      Tugas:
      - Cari berita paling mutakhir emiten ${ticker} khusus untuk tanggal hari ini ${today}

      Aturan:
			- Jika tidak ada berita paling mutakhir untuk emiten ${ticker}, maka cari berita sebelumnya.
			- Jangan cari berita emiten lain.
			- Ringkas dalam 1 paragraf.

      Format output:
			{
				"news": "ringkasan berita"
			}
		`

    const response = await this.aiService.generateContent({
      config: {
        responseMimeType: 'text/plain',
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
      contents: [
        {
          text: prompt,
        },
      ],
    })

    return parseJson<NewsAnalysis>(response.text!)
  }
}