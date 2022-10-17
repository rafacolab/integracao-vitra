import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

const BOND_TRANSACTION_TYPES = {
  1: 'CompraFinal',
  2: 'VendaFinal',
  3: 'CompraRevenda',
  4: 'VendaRecompra',
  6: 'VendaTotal',
};

const BOND_INDEXES = {
  1: 'CDI',
  61: 'IPCA',
  60: 'IGPM',
};

@Injectable()
export class BondService {
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
      `SELECT * INTO XLSX("/integracao-vitra/POSICOES_RENDA_FIXA_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
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
    const bondTransactions: Record<string, any>[] = [];
    const transactions = (
      await this.httpService.axiosRef.get(
        process.env.BRITECH_GET_BONDS_TRANSACTIONS,
        {
          params: {
            idCarteira: idPortfolio,
            dataInicio: startDate,
            dataFim: endDate,
          },
        },
      )
    ).data;

    const bondDetails = (
      await this.httpService.axiosRef.get(
        `${process.env.BRITECH_GET_FIXED_INCOMES}?idTituloRendaFixa=`,
      )
    ).data;

    const marketAgents = (
      await this.httpService.axiosRef.get(process.env.BRITECH_GET_MARKET_AGENTS)
    ).data;

    transactions.forEach((transaction) => {
      const bondDetail =
        bondDetails.find((b) => b.IdTitulo === Number(transaction.IdTitulo)) ||
        {};

      const marketAgent =
        marketAgents.find(
          (ma) => ma.IdAgente === transaction.IdAgenteCustodia,
        ) || {};

      bondTransactions.push({
        CustomerId: transaction.IdCliente,
        PortfolioId: transaction.IdCliente,
        OperationDate: transaction.DataOperacao.replace('T00:00:00', ''),
        SettlementDate: transaction.DataLiquidacao.replace('T00:00:00', ''),
        BondId: bondDetail.InformacoesBasicas.IdPapel,
        Name: bondDetail.InformacoesBasicas.Descricao,
        IssuerName: marketAgent.Nome,
        IssuerDocument: marketAgent.CNPJ,
        GrossValue: transaction.Valor,
        Quantity: transaction.Quantidade,
        UnitPrice: transaction.PUOperacao,
        IrValue: transaction.ValorIR,
        IofValue: transaction.ValorIOF,
        NetValue: transaction.ValorLiquido,
        OperationCode: BOND_TRANSACTION_TYPES[transaction.TipoOperacao],
        MaturityDate: bondDetail.InformacoesBasicas.DataVencimento.replace(
          'T00:00:00',
          '',
        ),
        IssueDate: bondDetail.InformacoesBasicas.DataEmissao.replace(
          'T00:00:00',
          '',
        ),
        IndexName: BOND_INDEXES[bondDetail.InformacoesBasicas.IdIndice],
        FloatedRate: bondDetail.InformacoesBasicas.Percentual,
        FixedRate: bondDetail.InformacoesBasicas.Taxa,
      });
    });
    this.alasql.promise(
      `SELECT * INTO XLSX("/integracao-vitra/TRANSACOES_RENDA_FIXA_${startDate}_${endDate}.xlsx", { headers: true }) FROM ?`,
      [bondTransactions],
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
