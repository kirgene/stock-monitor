export namespace Schema {
  export const StockPriceTodayTable = 'stock_price_today';
  export const StockPriceTable = 'stock_price';
  export const StockTable = 'stock';

  export interface Stock {
    id: number;
    name: string;
    symbol: string;
  }

  export interface StockPrice {
    stock_id: number;
    time: number;
    price: bigint;
  }

  export interface StockPriceToday extends StockPrice { }
}
