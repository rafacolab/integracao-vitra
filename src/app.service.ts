import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  alasql = require('alasql');
  constructor(private readonly httpService: HttpService) {}
  async getBondPositions({
    idClient,
    startDate,
    endDate,
  }: {
    idClient: number;
    startDate: string;
    endDate: string;
  }): Promise<boolean> {
    const startTime = new Date().getTime();
    const bondPositions: Record<string, any>[] = [];
    const positions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_BOND_POSITIONS,
        {
          params: {
            idCliente: idClient,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data.filter((p) => p.Quantidade > 0);

    try {
      const bondDetails = (
        await this.httpService.axiosRef.get(
          `${process.env.BRITECH_GET_FIXED_INCOMES}?idTituloRendaFixa=`,
        )
      ).data;

      const marketAgents = (
        await this.httpService.axiosRef.get(
          process.env.BRITECH_GET_MARKET_AGENTS,
        )
      ).data;

      positions.forEach((position) => {
        const bondDetail =
          bondDetails.find((b) => b.IdTitulo === Number(position.IdTitulo)) ||
          {};

        const marketAgent =
          marketAgents.find((ma) => ma.IdAgente === position.IdAgente) || {};

        bondPositions.push({
          CustomerId: position.IdCliente,
          PortfolioId: position.IdCliente,
          IdPosition: position.IdPosicao,
          Date: position.DataHistorico.replace('T00:00:00', ''),
          BondId: bondDetail.InformacoesBasicas.IdPapel,
          BondCode: position.IdTitulo,
          MaturityDate: position.DataVencimento.replace('T00:00:00', ''),
          AsseType: bondDetail.PapelRendaFixa.Descricao,
          Quantity: position.Quantidade,
          GrossValue: position.ValorMercado,
          UnitPrice: position.PUMercado,
          NetValue:
            position.ValorMercado - position.ValorIR - position.ValorIOF,
          IofValue: position.ValorIOF,
          irValue: position.ValorIR,
          Name: bondDetail.InformacoesBasicas.Descricao,
          IssuerName: marketAgent.Nome,
          IssuerDocument: marketAgent.CNPJ,
        });
      });
    } catch (error) {
      console.log(error);
    }

    this.alasql.promise(
      `SELECT * INTO XLSX("bondPositions.xlsx", { headers: true }) FROM ?`,
      [bondPositions],
    );

    const endTime = new Date().getTime();
    console.log(
      'Tempo de execução: ',
      ((endTime - startTime) / 1000).toFixed(2),
      'segundos',
    );

    return true;
  }

  async getFundPositions({
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
      const GrossValue =
        position.ValorFinal +
        position.ValorFinanceiroIRProvisionado +
        position.ValorFinanceiroIOFProvisionado;

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
      });
    });
    this.alasql.promise(
      `SELECT * INTO XLSX("fundPositions.xlsx", { headers: true }) FROM ?`,
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

  async getStockPositions({
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
      `SELECT * INTO XLSX("stockPositions.xlsx", { headers: true }) FROM ?`,
      [stockPositions],
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
