import * as DB from './db';
import {Provider, StockPrice} from './Provider';
import {Schema} from './Schema';
import {QueryBuilder} from 'knex';
import * as dayjs from 'dayjs';

export interface StockPriceFilter {
  timeStart?: Date;
  timeEnd?: Date;
  high?: number;
  low?: number;
  name?: string[];
}

export interface StockPriceDetails {
  id: number;
  name: string;
  symbol: string;
  price: number;
  time: string;
}

interface SymbolToID {
  [symbol: string]: number;
}

export class StockCache {
  private db: DB.KnexEx;
  private provider: Provider;
  private symbolToID: SymbolToID;

  public static async create(provider: Provider) {
    const stockCache = new StockCache();
    stockCache.db = await DB.getInstance();
    stockCache.provider = provider;
    await stockCache.populateMissingStocks();
    return stockCache;
  }

  private static isCurrentDate(date: Date) {
    return dayjs(date).isSame(new Date(), 'day');
  }

  public async getStocks(filter: string[]) {
    const query = this.db('stock');
    if (filter) {
      this.applyNameQueryFilter(query, filter);
    }
    return await query;
  }

  public async getStockPrices(filter: StockPriceFilter) {
    if (filter.timeStart && filter.timeEnd) {
      await this.populateMissingStockPrices(filter);
    } else {
      await this.populateLatestStockPrices(filter);
    }
    const stockPricesTables = ['stock_price', 'stock_price_today'];
    const prices: StockPriceDetails[] = [];
    for (const table of stockPricesTables) {
      const query = this.db('stock')
        .join(table, 'stock.id', '=', `${table}.stock_id`)
        .distinct('id', 'name', 'symbol', 'price', 'time')
        .where(true);
      this.applyQueryFilter(query, filter);
      query
        .orderBy('time')
        .limit(1000);
      const rows = await query;
      prices.push(...rows); // this should work as long as there is a limit in query
    }
    for (let price of prices) {
      price.price /= 1e4;
      price.time = new Date(parseInt(price.time)).toISOString();
    }
    return prices;
  }

  private async populateMissingStockPrices(filter: StockPriceFilter) {
    const timeStart = dayjs(filter.timeStart);
    const timeEnd = dayjs(filter.timeEnd);
    for (let m = timeStart; !m.isAfter(timeEnd, 'day'); m = m.add(1, 'day')) {
      if (StockCache.isCurrentDate(m.toDate())) {
        await this.populateLatestStockPrices(filter);
      }
      const exists = await this.stockExists(m.toDate());
      if (!exists) {
        await this.populateOldStockPrices(m.toDate());
      }
    }
  }

  private async populateMissingStocks() {
    if (!this.symbolToID) {
      const rows = await this.getSymbolsFromDB();
      this.symbolToID = {};
      for (let row of rows) {
        this.symbolToID[row.symbol] = row.id;
      }
    }
  }

  private applyNameQueryFilter(query: QueryBuilder, filter: string[]) {
    const filterExpr = filter.map(f => f
      .replace('%', '\\%')
      .replace('*', '%'));
    query
      .where(true)
      .andWhere(builder => {
        for (let expr of filterExpr) {
          builder.orWhere('name', 'ILIKE', expr)
            .orWhere('symbol', 'ILIKE', expr);
        }
      });
  }

  private constructor() {
  }

  private async getSymbolsFromDB() {
    let rows = await this.db.select('id', 'symbol').from<Schema.Stock>('stock');
    if (rows.length === 0) {
      // Populate cache
      const stocks = await this.provider.getStocks();
      rows = await this.db.batchInsert('stock', stocks).returning(['id', 'symbol']);
    }
    return rows;
  }

  private async populateLatestStockPrices(filter: StockPriceFilter) {
    const stocks = await this.getStocks(filter.name);
    const symbols = stocks.map(({symbol}) => symbol);
    const stockPrices = await this.provider.getStockPrices(symbols);
    const prices = stockPrices.map(stockPrice => ({
      stock_id: this.symbolToID[stockPrice.symbol],
      price: stockPrice.price,
      time: stockPrice.time,
    })).filter(price => !!price.stock_id);
    await this.db.batchInsert('stock_price_today', prices);
  }

  private async populateOldStockPrices(date: Date) {
    const tx = await this.db.createTransaction();
    await this.provider.getStockPricesHistory(date, async (stockPrices: StockPrice[]) => {
      const prices = stockPrices.map(stockPrice => ({
        stock_id: this.symbolToID[stockPrice.symbol],
        price: stockPrice.price,
        time: stockPrice.time,
      })).filter(price => !!price.stock_id);
      await this.db.batchInsert('stock_price', prices, 5000)
        .transacting(tx);
    });
    await tx.commit();
  }

  private async stockExists(date: Date) {
    const timestampStart = dayjs(date).startOf('day').unix() * 1000;
    const timestampEnd = dayjs(date).endOf('day').unix() * 1000;
    const rows = await this.db('stock_price')
      .whereBetween('time', [timestampStart, timestampEnd])
      .limit(1);
    return rows.length > 0;
  }

  private applyQueryFilter(query: QueryBuilder, filter: StockPriceFilter) {
    if (filter.timeStart && filter.timeEnd) {
      const start = filter.timeStart.getTime();
      const end = filter.timeEnd.getTime();
      query.andWhereBetween('time', [start, end]);
    }
    if (filter.high && filter.low) {
      query.andWhereBetween('price', [filter.low * 1e4, filter.high * 1e4]);
    } else if (filter.high) {
      query.andWhere('price', '<', filter.high * 1e4);
    } else if (filter.low) {
      query.andWhere('price', '>', filter.high * 1e4);
    }
    if (filter.name) {
      query.andWhere((builder) => this.applyNameQueryFilter(builder, filter.name));
    }
  }
}


