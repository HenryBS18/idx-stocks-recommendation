import KeyvRedis from '@keyv/redis'
import { Injectable, Logger } from '@nestjs/common'
import { EnvService } from 'src/env/env.service'

@Injectable()
export class RedisService {
  private readonly logger: Logger
  private readonly redis: KeyvRedis<unknown>

  constructor(private readonly env: EnvService) {
    this.logger = new Logger(RedisService.name)

    this.redis = new KeyvRedis(this.env.REDIS_URL)

    if (!this.env.CACHE_ENABLED) return

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
