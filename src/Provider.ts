export interface Stock {
  symbol: string;
  name: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  time: number;
}

export type SubscriberCallback = (data: StockPrice) => void;
export type StockPriceCallback = (stockPrice: StockPrice[]) => Promise<void>;

export abstract class Provider {
  private subscribers: Map<string, Set<SubscriberCallback>> = new Map();

  protected abstract subscribeSymbol(symbol: string): void;
  protected abstract unsubscribeSymbol(symbol: string): void;

  public abstract getStocks(): Promise<Stock[]>;
  public abstract getStockPrices(symbols: string[]): Promise<StockPrice[]>;
  public abstract getStockPricesHistory(date: Date, callback: StockPriceCallback): Promise<void>;

  public subscribe(stockSymbols: string[], callback: SubscriberCallback) {
    for (const symbol of stockSymbols) {
      const exists = this.subscribers.has(symbol);
      if (!exists) {
        this.subscribers.set(symbol, new Set());
      }
      const empty = this.subscribers.get(symbol).size === 0;
      this.subscribers.get(symbol).add(callback);
      if (empty) {
        this.subscribeSymbol(symbol);
      }
    }
  }

  public unsubscribe(stockSymbols: string[], callback: SubscriberCallback) {
    for (const symbol of stockSymbols) {
      if (this.subscribers.has(symbol)) {
        this.unsubscribeOne(symbol, callback);
      }
    }
  }

  public unsubscribeAll(callback: SubscriberCallback) {
    this.subscribers.forEach((callbacks, symbol) => {
      if (callbacks.has(callback)) {
        this.unsubscribeOne(symbol, callback);
      }
    });
  }

  protected notifySubscribers(symbol: string, data: StockPrice) {
    this.subscribers.get(symbol).forEach(
      callback => callback(data),
    );
  }

  private unsubscribeOne(symbol: string, callback: SubscriberCallback) {
    this.subscribers.get(symbol).delete(callback);
    if (this.subscribers.get(symbol).size === 0) {
      this.unsubscribeSymbol(symbol);
    }
  }
}
