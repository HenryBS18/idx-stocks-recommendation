import { systemInstruction } from '@app/constants'
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
          systemInstruction: systemInstruction,
          temperature: 0.1,
          responseMimeType: params.config?.responseMimeType ?? 'application/json',
          abortSignal: controller.signal
        },

      })
    } catch (error) {
      let errorMessage = ''

      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('high demand')) errorMessage = 'AI model is currently unavailable'
        else if (error.name === 'AbortError') errorMessage = 'Request timeout'
      }

      throw new Error(errorMessage)
    } finally {
      clearTimeout(timeout)
    }
  }

  async upload(params: UploadFileParameters): Promise<File> {
    return await this.ai.files.upload(params)
  }
}