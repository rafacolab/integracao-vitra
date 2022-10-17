import { Module } from '@nestjs/common';
import { BondService } from './services/bond.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { StockService } from './services/stock.service';
import { FundService } from './services/fund.service';
import { CashService } from './services/cash.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule.register({
      baseURL: process.env.BRITECH_BASE_URL,
      timeout: 60000,
      auth: {
        username: process.env.BRITECH_USERNAME,
        password: process.env.BRITECH_PASSWORD,
      },
    }),
  ],
  providers: [BondService, StockService, FundService, CashService],
})
export class AppModule {}
