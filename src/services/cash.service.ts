import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CashService {
  alasql = require('alasql');
  constructor(private readonly httpService: HttpService) {}
  async getPositions({
    idClient,
    startDate,
    endDate,
  }: {
    idClient: number;
    startDate: string;
    endDate: string;
  }): Promise<boolean> {
    const startTime = new Date().getTime();
    const cashPositions: Record<string, any>[] = [];
    const positions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_RETURNS_AND_POSITIONS,
        {
          params: {
            idCliente: idClient,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data.filter((p) => p.TipoAtivo.includes('Conta Corrente'));

    positions.forEach(async (position) => {
      cashPositions.push({
        CustomerId: position.IdCliente,
        PortfolioId: position.IdCliente,
        Date: position.Data.replace('T00:00:00', ''),
        GrossValue: position.ValorFinal,
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/POSICOES_CAIXA_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [cashPositions],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução: ',
      ((endTime - startTime) / 1000).toFixed(2),
      'segundos',
    );
    return true;
  }
  async getTransactions({
    idPortfolio,
    startDate,
    endDate,
  }: {
    idPortfolio: number;
    startDate: string;
    endDate: string;
  }): Promise<boolean> {
    const startTime = new Date().getTime();
    const cashTransactions: Record<string, any>[] = [];
    const transactions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_RETURNS_AND_POSITIONS,
        {
          params: {
            idCliente: idPortfolio,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data.filter(
      (t) =>
        t.DescricaoAtivo === 'Aplicações do dia' ||
        t.DescricaoAtivo.includes('Resgates no dia'),
    );

    transactions.forEach(async (transaction) => {
      const OperationDirection =
        transaction.DescricaoAtivo === 'Aplicações do dia'
          ? 'Depósito'
          : 'Retirada';
      cashTransactions.push({
        CustomerId: transaction.IdCliente,
        PortfolioId: transaction.IdCliente,
        Date: transaction.Data.replace('T00:00:00', ''),
        Description: transaction.DescricaoAtivo,
        OperationDirection,
        Value: Math.abs(transaction.ValorSaida),
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/TRANSACOES_CAIXA_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [cashTransactions],
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
