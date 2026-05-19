import KeyvRedis from '@keyv/redis'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
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
        const redisUrl = configService.getOrThrow<string>('REDIS_URL')
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
export class AppModule { }
