import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BondService } from './services/bond.service';
import { StockService } from './services/stock.service';
import { FundService } from './services/fund.service';
import { CashService } from './services/cash.service';
import yargs from 'yargs';
import { PortfolioService } from './services/portfolio.service';

async function bootstrap() {
  const argv = yargs(process.argv.slice(2)).argv as Record<string, any>;
  const app = await NestFactory.createApplicationContext(AppModule);
  const bondService = app.get(BondService);
  const stockService = app.get(StockService);
  const fundService = app.get(FundService);
  const cashService = app.get(CashService);
  const portfolioService = app.get(PortfolioService);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');

  fs.mkdir('/integracao-vitra', (err) => {
    if (err) {
      return console.error(err);
    }
    console.log('Directory created successfully!');
  });

  try {
    await bondService.getPositions({
      idClient: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await bondService.getTransactions({
      idPortfolio: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await stockService.getPositions({
      idClient: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await stockService.getTransactions({
      idPortfolio: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await fundService.getPositions({
      idClient: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await fundService.getTransactions({
      idPortfolio: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await cashService.getPositions({
      idClient: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await cashService.getTransactions({
      idPortfolio: argv.portfolioId,
      startDate: argv.startDate,
      endDate: argv.endDate,
    });

    await portfolioService.getPortfolios();
  } catch (error) {
    console.log(error);
  }
}
bootstrap();
