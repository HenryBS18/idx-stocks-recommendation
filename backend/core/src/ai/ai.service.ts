import { GenerateContentParams } from '@app/types'
import { File, GenerateContentResponse, GoogleGenAI, UploadFileParameters } from '@google/genai'
import { Injectable } from '@nestjs/common'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class AiService {
  private ai: GoogleGenAI

  constructor(private readonly env: EnvService) {
    this.ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY })
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResponse> {
    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, 20000)

    try {
      return await this.ai.models.generateContent({
        ...params,
        model: this.env.AI_MODEL,
        config: {
          ...params.config,
          systemInstruction: params.config?.systemInstruction,
          temperature: 0,
          responseMimeType: params.config?.responseMimeType ?? 'application/json',
          abortSignal: controller.signal
        },

      })
    } finally {
      clearTimeout(timeout)
    }
  }

  async upload(params: UploadFileParameters): Promise<File> {
    return await this.ai.files.upload(params)
  }
}