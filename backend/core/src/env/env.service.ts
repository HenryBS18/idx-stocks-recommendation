import { CacheDriver } from '@app/types'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class EnvService {
  private readonly geminiApiKey: string
  private readonly stockDataApiUrl: string
  private readonly aiModel: string
  private readonly cacheEnabled: boolean
  private readonly redisHost: string
  private readonly redisPort: number
  private readonly redisUser: string
  private readonly redisPassword: string
  private readonly cacheDriver: CacheDriver

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.getOrThrow('GEMINI_API_KEY')
    this.stockDataApiUrl = this.configService.getOrThrow('STOCK_DATA_API_URL')
    this.aiModel = this.configService.getOrThrow('AI_MODEL')
    this.cacheEnabled = this.configService.getOrThrow('CACHE_ENABLED') === 'true'
    this.redisHost = this.configService.getOrThrow('REDIS_HOST')
    this.redisPort = parseInt(this.configService.getOrThrow('REDIS_PORT'))
    this.redisUser = this.configService.getOrThrow('REDIS_USER')
    this.redisPassword = this.configService.getOrThrow('REDIS_PASSWORD')
    this.cacheDriver = this.configService.getOrThrow('CACHE_DRIVER')
  }

  get GEMINI_API_KEY(): string {
    return this.geminiApiKey
  }

  get STOCK_DATA_API_URL(): string {
    return this.stockDataApiUrl
  }

  get AI_MODEL(): string {
    return this.aiModel
  }

  get CACHE_ENABLED(): boolean {
    return this.cacheEnabled
  }

  get REDIS_URL(): string {
    return `redis://${this.redisUser}:${this.redisPassword}@${this.redisHost}:${this.redisPort}`
  }

  get CACHE_DRIVER(): CacheDriver {
    return this.cacheDriver
  }
}
