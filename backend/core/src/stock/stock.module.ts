import { Module } from '@nestjs/common'
import { AnalysisModule } from 'src/analysis/analysis.module'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'

@Module({
  imports: [AnalysisModule],
  providers: [StockService],
  controllers: [StockController],
})
export class StockModule { }
