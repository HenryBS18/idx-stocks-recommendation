import { Module } from '@nestjs/common'
import { AiService } from './services/ai.service'
import { AnalysisService } from './services/analysis.service'
import { BrokerService } from './services/broker.service'
import { FundamentalService } from './services/fundamental.service'
import { NewsService } from './services/news.service'
import { TechnicalService } from './services/technical.service'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'

@Module({
  providers: [StockService, AiService, TechnicalService, BrokerService, FundamentalService, NewsService, AnalysisService],
  controllers: [StockController],
})
export class StockModule { }
