import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from './common/common.module'
import { StockModule } from './stock/stock.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CacheModule.register({ isGlobal: true }), StockModule, CommonModule]
})
export class AppModule { }
