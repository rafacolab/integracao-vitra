import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StockService {
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
    const stockPositions: Record<string, any>[] = [];
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
    ).data.filter((p) => p.QtdeAbertura > 0 && p.TipoAtivo.includes('Bolsa'));

    positions.forEach(async (position) => {
      const GrossValue =
        position.ValorFinal +
        position.ValorFinanceiroIRProvisionado +
        position.ValorFinanceiroIOFProvisionado;

      stockPositions.push({
        CustomerId: position.IdCliente,
        PortfolioId: position.IdCliente,
        Date: position.Data.replace('T00:00:00', ''),
        Ticker: position.CodigoAtivo,
        Quantity: position.QtdeFechamento,
        GrossValue,
        UnitPrice: GrossValue / position.QtdeFechamento,
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/POSICOES_RENDA_VARIAVEL_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [stockPositions],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução para posições de renda variável: ',
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
    const stockTransactions: Record<string, any>[] = [];
    const transactions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_STOCK_TRANSACTIONS,
        {
          params: {
            idCarteira: idPortfolio,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data;

    transactions.forEach(async (transaction) => {
      stockTransactions.push({
        CustomerId: transaction.IdCliente,
        PortfolioId: transaction.IdCliente,
        OperationDate: transaction.DataOperacao.replace('T00:00:00', ''),
        SettlementDate: transaction.DataLiquidacao.replace('T00:00:00', ''),
        Ticker: transaction.CdAtivoBolsa,
        Quantity: transaction.Quantidade,
        GrossValue: transaction.Valor,
        UnitPrice: transaction.PU,
        OperationType: transaction.TipoOperacao,
        OperationDirection:
          transaction.TipoOperacao === 'C' ? 'Compra' : 'Venda',
        NetValue: transaction.ValorLiquido,
        CostsValue:
          transaction.Corretagem +
          transaction.Emolumento -
          transaction.Desconto,
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/TRANSACOES_RENDA_VARIAVEL_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [stockTransactions],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução para transações de renda variável: ',
      ((endTime - startTime) / 1000).toFixed(2),
      'segundos',
    );
    return true;
  }
}
