import { Module } from '@nestjs/common';
import { BondService } from './services/bond.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { StockService } from './services/stock.service';
import { FundService } from './services/fund.service';
import { CashService } from './services/cash.service';
import { PortfolioService } from './services/portfolio.service';
import { TypeOrmModule } from '@nestjs/typeorm';

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
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'sql-meuportfolio.cvy5lr8wtvss.sa-east-1.rds.amazonaws.com',
      port: 1433,
      username: 'usr_integrationVitra',
      password: 'x9Rr6bFDHbp%2L3',
      database: 'integrationVitra',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
  ],
  providers: [
    BondService,
    StockService,
    FundService,
    CashService,
    PortfolioService,
  ],
})
export class AppModule {}
