import { systemInstruction } from '@constants/ai'
import { File, GenerateContentResponse, GoogleGenAI, UploadFileParameters } from '@google/genai'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GenerateContentParams } from '@types'

@Injectable()
export class AiService {
  private ai: GoogleGenAI
  private model: string

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') })
    this.model = this.configService.getOrThrow<string>('AI_MODEL')
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResponse> {
    try {
      return await this.ai.models.generateContent({
        ...params,
        model: this.model,
        config: {
          ...params.config,
          systemInstruction: systemInstruction,
          temperature: 0.1,
          responseMimeType: params.config?.responseMimeType ?? 'application/json'
        }
      })
    } catch (error) {
      let errorMessage = ''

      if (error instanceof Error) {
        errorMessage = JSON.parse(error.message).message as string

        if (errorMessage.toLowerCase().includes('high demand')) errorMessage = 'AI model is currently unavailable'
      }

      throw new Error(errorMessage)
    }
  }

  async upload(params: UploadFileParameters): Promise<File> {
    return await this.ai.files.upload(params)
  }
}