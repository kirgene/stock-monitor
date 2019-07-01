import {Provider, Stock, StockPrice, StockPriceCallback} from '../Provider';
import * as faker from 'faker';

interface SubscriberData {
  [symbol: string]: any;
}

export class Test extends Provider {
  private static instance: Test;
  private stocks: Stock[];
  private subscriberData: SubscriberData = {};

  /**
   * @param min minimum value (inclusive)
   * @param max maximum value (exclusive)
   */
  private static randomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  private static randomStr(min: number, max: number) {
    let result           = '';
    const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersLength = characters.length;
    const length = Test.randomInt(min, max);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  public async getStocks() {
    this.stocks = [];
    const count = Test.randomInt(50, 100);
    for (let i = 0; i < count; i++) {
      this.stocks.push({
        name: faker.company.companyName(),
        symbol: Test.randomStr(3, 6),
      });
    }
    return this.stocks;
  }

  public async getStockPrices(symbols: string[]) {
    return this.stocks.map(({symbol}) => ({
      symbol,
      price: parseFloat(faker.commerce.price(10, 1000)),
      time: Date.now(),
    }));
  }

  public async getStockPricesHistory(date: Date, callback: StockPriceCallback) {
    throw new Error('NOT_IMPLEMENTED');
  }

  protected subscribeSymbol(symbol: string) {
    this.subscriberData[symbol] = setInterval(() => {
      const stockPrice: StockPrice = {
        symbol,
        price: parseFloat(faker.commerce.price(10, 1000)),
        time: Date.now(),
      };
      this.notifySubscribers(symbol, stockPrice);
    }, 1000);
  }

  protected unsubscribeSymbol(symbol: string) {
    clearInterval(this.subscriberData[symbol]);
  }
}
