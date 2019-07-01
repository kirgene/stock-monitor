export interface IEXStock {
  symbol: string;
  name: string;
  date: string;
  isEnabled: boolean;
}

export interface IEXStockPrice {
  symbol: string;
  price: number;
  size: number;
  time: number;
}

export interface IEXHistory {
  link: string;
  date: string;
  feed: string;
  version: string;
  protocol: string;
  size: string;
}
