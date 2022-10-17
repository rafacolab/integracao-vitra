import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

const FUND_OPERATION_TYPES = {
  1: 'Aplicação',
  2: 'ResgateBruto',
  3: 'ResgateLiquido',
  4: 'ResgateCotas',
  5: 'ResgateTotal',
};

@Injectable()
export class FundService {
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
    const fundPositions: Record<string, any>[] = [];
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
    ).data.filter(
      (p) => p.QtdeAbertura > 0 && p.TipoAtivo.includes('Operação Fundo'),
    );

    const marketAgents = (
      await this.httpService.axiosRef.get(process.env.BRITECH_GET_MARKET_AGENTS)
    ).data;

    function uniq(value, index, self) {
      return self.indexOf(value) === index;
    }

    const idCliente = JSON.stringify(
      positions.map((p) => Number(p.CodigoAtivo)).filter(uniq),
    )
      .replace('[', '')
      .replace(']', '');

    const funds = (
      await this.httpService.axiosRef.get(process.env.BRITECH_GET_FUNDS, {
        params: {
          idCliente,
        },
      })
    ).data;

    positions.forEach(async (position) => {
      const fund = funds.find(
        (f) => f.CarteiraInfo.IdCarteira === Number(position.CodigoAtivo),
      );

      const administrator =
        marketAgents.find(
          (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Administrador),
        ) || {};

      const custodiant =
        marketAgents.find(
          (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Custodiante),
        ) || {};

      const manager =
        marketAgents.find(
          (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Custodiante),
        ) || {};

      const GrossValue =
        position.ValorFinal +
        position.ValorFinanceiroIRProvisionado +
        position.ValorFinanceiroIOFProvisionado;

      fundPositions.push({
        CustomerId: position.IdCliente,
        PortfolioId: position.IdCliente,
        Date: position.Data.replace('T00:00:00', ''),
        GrossValue,
        NetValue: position.ValorFinal,
        Quantity: position.QtdeFechamento,
        QuotaValue: GrossValue / position.QtdeFechamento,
        IofValue: position.ValorFinanceiroIOFProvisionado,
        IrValue: position.ValorFinanceiroIRProvisionado,
        FundDocument: fund.CarteiraInfo.CPFCNPJFundo,
        ISIN: fund.CarteiraInfo.CodigoISIN,
        AdministratorDocument: administrator.CNPJ,
        CustodiantDocument: custodiant.CNPJ,
        ManagerDocument: manager.CNPJ,
        FundName: fund.CarteiraInfo.Nome,
        FundAlias: fund.CarteiraInfo.Apelido,
      });
    });
    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/POSICOES_FUNDOS_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [fundPositions],
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
    const fundTransactions: Record<string, any>[] = [];
    const transactions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_FUNDS_TRANSACTIONS,
        {
          params: {
            idCarteira: idPortfolio,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data;

    const marketAgents = (
      await this.httpService.axiosRef.get(process.env.BRITECH_GET_MARKET_AGENTS)
    ).data;

    function uniq(value, index, self) {
      return self.indexOf(value) === index;
    }

    const idCliente = JSON.stringify(
      transactions.map((t) => Number(t.IdCarteira)).filter(uniq),
    )
      .replace('[', '')
      .replace(']', '');

    const funds = (
      await this.httpService.axiosRef.get(process.env.BRITECH_GET_FUNDS, {
        params: {
          idCliente,
        },
      })
    ).data;

    transactions.forEach((transaction) => {
      const { fund, administrator, custodiant, manager } = this.getFundInfo(
        funds,
        transaction,
        marketAgents,
      );

      fundTransactions.push({
        CustomerId: transaction.IdCliente,
        PortfolioId: transaction.IdCliente,
        OperationDate: transaction.DataOperacao.replace('T00:00:00', ''),
        CotizationDate: transaction.DataConversao.replace('T00:00:00', ''),
        SettlementDate: transaction.DataLiquidacao.replace('T00:00:00', ''),
        GrossValue: transaction.ValorBruto,
        Quantity: transaction.Quantidade,
        QuotaValue: transaction.CotaOperacao,
        IrValue: transaction.ValorIR,
        IofValue: transaction.ValorIOF,
        NetValue: transaction.ValorLiquido,
        FundDocument: fund.CarteiraInfo.CPFCNPJFundo,
        ISIN: fund.CarteiraInfo.CodigoISIN,
        AdministratorDocument: administrator.CNPJ,
        CustodiantDocument: custodiant.CNPJ,
        ManagerDocument: manager.CNPJ,
        FundName: fund.CarteiraInfo.Nome,
        FundAlias: fund.CarteiraInfo.Apelido,
        OperationType: FUND_OPERATION_TYPES[transaction.TipoOperacao],
      });
    });

    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/TRANSACOES_FUNDOS_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [fundTransactions],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução: ',
      ((endTime - startTime) / 1000).toFixed(2),
      'segundos',
    );
    return true;
  }

  private getFundInfo(funds: any, transaction: any, marketAgents: any) {
    const fund = funds.find(
      (f) => f.CarteiraInfo.IdCarteira === Number(transaction.IdCarteira),
    );

    const administrator =
      marketAgents.find(
        (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Administrador),
      ) || {};

    const custodiant =
      marketAgents.find(
        (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Custodiante),
      ) || {};

    const manager =
      marketAgents.find(
        (ma) => ma.IdAgente === Number(fund.CarteiraInfo.Custodiante),
      ) || {};
    return { fund, administrator, custodiant, manager };
  }
}
