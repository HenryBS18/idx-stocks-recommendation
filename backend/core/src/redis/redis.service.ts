import KeyvRedis from '@keyv/redis'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RedisService {
  private readonly logger: Logger
  private readonly redis: KeyvRedis<unknown>

  constructor(private readonly configService: ConfigService) {
    this.logger = new Logger(RedisService.name)

    const redisHost = this.configService.get<string>('REDIS_HOST')
    const redisPort = this.configService.get<string>('REDIS_PORT')
    const redisUser = this.configService.get<string>('REDIS_USER')
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD')

    const redisUrl = `redis://${redisUser}:${redisPassword}@${redisHost}:${redisPort}`

    this.redis = new KeyvRedis(redisUrl)

    this.redis.on('connect', () => {
      this.logger.log('Connected')
    })

    this.redis.on('reconnecting', () => {
      this.logger.log('Reconnecting')
    })

    this.redis.on('disconnect', () => {
      this.logger.log('Disconnected')
    })

    this.redis.on('error', (err) => {
      this.logger.error(err)
    })

    this.redis.client.connect()
  }

  get redisStore(): KeyvRedis<unknown> {
    return this.redis
  }
}
