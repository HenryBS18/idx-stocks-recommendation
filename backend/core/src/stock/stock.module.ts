import { Module } from '@nestjs/common'
import { AiService } from './services/ai.service'
import { BrokerService } from './services/broker.service'
import { FundamentalService } from './services/fundamental.service'
import { NewsService } from './services/news.service'
import { SummaryService } from './services/summary.service'
import { TechnicalService } from './services/technical.service'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'

@Module({
  providers: [AiService, BrokerService, FundamentalService, NewsService, SummaryService, TechnicalService, StockService],
  controllers: [StockController],
})
export class StockModule { }
