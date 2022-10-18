import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PortfolioService {
  alasql = require('alasql');
  constructor(private readonly httpService: HttpService) {}

  async getPortfolios(): Promise<boolean> {
    const startTime = new Date().getTime();
    const portfolioResult: Record<string, any>[] = [];
    const portfolios = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_RETURNS_AND_POSITIONS,
      )
    ).data;

    portfolios.forEach((portfolio) => {
      portfolioResult.push({
        Id: portfolio.IdCliente,
        CustomerId: portfolio.IdClente,
        Name: portfolio.Apelido,
        Type: portfolio.TipoCarteira,
        InitialDate: portfolio.DataImplantacao.replace('T00:00:00', ''),
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/PORTFOLIOS.xlsx", { headers: true }) FROM ?`,
      [portfolioResult],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução: ',
      ((endTime - startTime) / 1000).toFixed(2),
      'segundos',
    );
    return true;
  }
}
