import { Module } from '@nestjs/common'
import { AiModule } from 'src/ai/ai.module'
import { BrokerService } from './broker.service'
import { FundamentalService } from './fundamental.service'
import { NewsService } from './news.service'
import { SummaryService } from './summary.service'
import { TechnicalService } from './technical.service'

@Module({
  imports: [AiModule],
  providers: [BrokerService, FundamentalService, NewsService, SummaryService, TechnicalService],
  exports: [BrokerService, FundamentalService, NewsService, SummaryService, TechnicalService],
})
export class AnalysisModule { }
