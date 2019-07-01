import { parentPort } from 'worker_threads';
import {IEXStockPrice} from './Common';
import {IEXParser} from './IEXParser';
import * as util from 'util';
import * as stream from 'stream';
import axios from 'axios';
import * as PcapParser from 'pcap-ng-parser';
import * as zlib from 'zlib';
import * as progressStream from 'progress-stream';
import logger from '../../logger';

type StockPriceCallback = (stockPrice: IEXStockPrice[]) => Promise<void>;

async function _getStockPricesHistoryFromURL(url: string, callback: StockPriceCallback) {
  const pipeline = util.promisify(stream.pipeline);
  const histStream = await axios({
    url,
    responseType: 'stream',
  });
  const progress = progressStream({
    length: parseInt(histStream.headers['content-length']),
    time: 1000, /* ms */
  });
  progress.on('progress', (status) => {
    logger.info(`IEX worker: ${status.percentage.toFixed(2)}%, ` +
      `ETA ${status.eta}s, ${(status.speed / 1e6).toFixed(2)}Mbit/s`);
  });
  const pcapParser = new PcapParser();
  // HACK: _flush method in this class is redundant and causing errors, so just mock it
  pcapParser._flush = (cb) => cb();
  const iexParser = new IEXParser(callback);
  await pipeline(
    histStream.data,
    progress,
    zlib.createGunzip(),
    pcapParser,
    iexParser,
  );
}

export async function getStockPricesHistoryFromURL(url: string) {
  if (typeof url !== 'string') {
    throw new Error('data must be a string URL');
  }

  let messageId = 0;

  const processPrices = (prices: IEXStockPrice[]) =>
    new Promise<void>(resolve => {
      messageId++;
      parentPort.postMessage({
        id: messageId,
        data: prices,
      });
      let onMessageId: (id: number) => void;
      onMessageId = (id) => {
        if (id === messageId) {
          parentPort.off('message', onMessageId);
          resolve();
        }
      };
      parentPort.on('message', onMessageId);
    });

  await _getStockPricesHistoryFromURL(url, processPrices);
}

if (0) {
  // Just for quick test
  (async () => {
    await getStockPricesHistoryFromURL('https://www.googleapis.com/download/storage/v1/b/iex/o/' +
      'data%2Ffeeds%2F20190612%2F20190612_IEXTP1_TOPS1.6.pcap.gz' +
      '?generation=1560390746432129&alt=media');
  })();
}
