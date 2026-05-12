import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { StockModule } from './stock/stock.module'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from './common/common.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), StockModule, CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
