import KeyvRedis from '@keyv/redis'
import { CacheModule } from '@nestjs/cache-manager'
import { Logger, Module, OnModuleInit } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CommonModule } from './common/common.module'
import { StockModule } from './stock/stock.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL')
        const redis = new KeyvRedis(redisUrl)

        return {
          stores: [redis]
        }
      }
    }),
    StockModule,
    CommonModule
  ]
})
export class AppModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL')
    const redis = new KeyvRedis(redisUrl)

    redis.on('connect', () => {
      Logger.log('Connected', 'Redis')
    })

    redis.on('reconnecting', () => {
      Logger.log('Reconnecting', 'Redis')
    })

    redis.on('disconnect', () => {
      Logger.log('Disconnected', 'Redis')
    })

    redis.on('error', (err) => {
      Logger.error(err, 'Redis')
    })

    try {
      await redis.client.connect()
    } catch (error) {
      if (error instanceof Error) Logger.error(error.message, 'Redis')
    }
  }
}
