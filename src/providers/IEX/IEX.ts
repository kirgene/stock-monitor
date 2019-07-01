import * as socketClient from 'socket.io-client';
import axios from 'axios';
import {URL} from 'url';
import { IEXParser } from './IEXParser';
import {Provider, Stock, StockPrice, StockPriceCallback} from '../../Provider';
import {IEXHistory, IEXStock, IEXStockPrice} from './Common';
import logger from '../../logger';
import * as dayjs from 'dayjs';
import {Worker} from 'worker_threads';
import * as path from 'path';

export class IEX extends Provider {
  private static readonly STOCK_URL = 'https://api.iextrading.com/1.0/ref-data/symbols';
  private static readonly STOCK_PRICE_URL = 'https://api.iextrading.com/1.0/tops/last';
  private static readonly STOCK_PRICE_WS = 'https://ws-api.iextrading.com/1.0/last';
  private static readonly STOCK_HISTORY_URL = 'https://api.iextrading.com/1.0/hist';
  private socket: SocketIOClient.Socket;

  private static async fetch<T>(url: string) {
    let response;
    try {
      response = await axios.get(url);
    } catch (error) {
      logger.warn(`Failed to fetch URL ${url}: ${error.toString()}`);
    }
    return response ? response.data as T : null;
  }

  public constructor() {
    super();
    this.socket = socketClient.connect(IEX.STOCK_PRICE_WS);
    this.socket.on('message', this.processMessage.bind(this));
    //stockStream.on('connect');
    this.socket.on('disconnect', () =>
      logger.debug('IEX socket disconnected'));
  }

  public async getStocks() {
    let result: Stock[] = [];
    const response = await IEX.fetch<IEXStock[]>(IEX.STOCK_URL);
    if (response) {
      result = response
        .filter(stock => stock.isEnabled)
        .map(({name, symbol}) => ({name, symbol}));
    }
    return result;
  }

  public async getStockPricesHistory(date: Date, callback: StockPriceCallback) {
    const url = new URL(IEX.STOCK_HISTORY_URL);
    url.searchParams.set('date', dayjs(date).format('YYYYMMDD'));
    const histList = await IEX.fetch<IEXHistory[]>(url.href);
    let hist: IEXHistory;
    if (histList) {
      hist = histList
        .filter((h) => IEXParser.isSupported(h.feed, h.protocol, h.version))
        .sort((a, b) => parseInt(a.size) - parseInt(b.size))
        .pop();
    }
    if (hist) {
      try {
        await new Promise((resolve, reject) => {
          const data = {
            workerData: {
              path: 'IEXWorkers',
              method: 'getStockPricesHistoryFromURL',
              data: hist.link,
            },
          };
          const worker = new Worker(path.resolve(__dirname, 'Worker.js'), data);
          worker.on('message', async (message) => {
            if (message.error) {
              return reject(new Error(message.error));
            }
            const iexPrices = message.data as IEXStockPrice[];
            const prices = iexPrices.map(iexPrice => ({
              symbol: iexPrice.symbol,
              price: iexPrice.price,
              time: iexPrice.time,
            }));
            await callback(prices);
            // console.log('SEND MESSAGE ID');
            worker.postMessage(message.id);
          });
          worker.on('error', reject);
          worker.on('online', () =>
            logger.debug('IEX worker is ONLINE'));
          worker.on('exit', (code) =>
            code === 0 ? resolve() : reject('process terminated'));
        });
        logger.debug('IEX worker is OFFLINE');
      } catch (e) {
        logger.error(`Failed to execute getStockPricesHistoryFromURL:\n${e.message}`);
      }
    }
  }

  public async getStockPrices(symbols: string[]) {
    let result: StockPrice[] = [];
    const url = new URL(IEX.STOCK_PRICE_URL);
    // Apply filter only if it's small, otherwise return all prices
    if (symbols.length > 0 && symbols.length < 200) {
      url.searchParams.set('symbols', symbols.join(','));
    }
    const response = await IEX.fetch<IEXStockPrice[]>(url.href);
    if (response) {
      result = response.map(
        ({symbol, price, time}) => ({
          symbol,
          price: Math.trunc(price * 1e4),
          time,
        }),
      );
    }
    return result;
  }

  protected subscribeSymbol(symbol: string) {
    this.socket.emit('subscribe', symbol);
  }

  protected unsubscribeSymbol(symbol: string) {
    this.socket.emit('unsubscribe', symbol);
  }

  private processMessage(message: string) {
    let data: IEXStockPrice;
    try {
      data = JSON.parse(message);
    } catch (e) {
      logger.warn(`Failed to parse IEXStockPrice message: ${e.toString()}`);
    }
    if (data) {
      const result: StockPrice = {
        symbol: data.symbol.toUpperCase(),
        price: data.price,
        time: data.time,
      };
      this.notifySubscribers(result.symbol, result);
    }
  }
}
