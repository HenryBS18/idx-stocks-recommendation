import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EnvModule } from 'src/env/env.module'
import { AiModule } from './ai/ai.module'
import { AnalysisModule } from './analysis/analysis.module'
import { CommonModule } from './common/common.module'
import { EnvService } from './env/env.service'
import { RedisModule } from './redis/redis.module'
import { RedisService } from './redis/redis.service'
import { StockModule } from './stock/stock.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [EnvService, RedisService],
      useFactory: async (env: EnvService, redisService: RedisService) => {
        if (!env.CACHE_ENABLED || env.CACHE_DRIVER !== 'redis') return {}

        return {
          stores: [redisService.redisStore]
        }
      }
    }),
    AiModule,
    AnalysisModule,
    CommonModule,
    EnvModule,
    RedisModule,
    StockModule,
  ],
})
export class AppModule { }
