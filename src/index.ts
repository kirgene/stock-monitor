import * as express from 'express';
import * as expressWs from 'express-ws';
import * as cors from 'cors';
import {StockCache} from './StockCache';
import {getProvider, getSupportedProviders} from './providers';
import config from './config';
import {Provider, StockPrice} from './Provider';
import logger from './logger';
import { Request, Response, NextFunction } from 'express';
import {
  LatestPriceFilter, LatestPriceFilterSchema,
  PriceFilter, PriceFilterSchema,
  StockFilter, StockFilterSchema,
} from './validation';

import {
  ValidatedRequest,
  createValidator,
} from 'express-joi-validation';

const { app } = expressWs(express());

let cache: StockCache;
let provider: Provider;
const validator = createValidator({passError: true});

// app.use(cors({credentials: true, origin: 'http://localhost:3000'}));

app.use(cors({
  origin: (origin, callback) => {
    return callback(null, true);
  },
  optionsSuccessStatus: 200,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function getSymbolsByFilter(filter: string[]) {
  const stocks = await cache.getStocks(filter);
  return stocks.map(({symbol}) => symbol);
}

app.use('/demo', express.static('public'));

app.ws('/latest-prices', (ws, req) => {
  logger.debug('WS connection opened');
  (ws as any).onStockData = (msg: any) => {
    if (!msg.errors) {
      msg = {
        data: {
          ...msg,
          time: new Date(msg.time).toISOString(),
        },
      };
    }
    ws.send(JSON.stringify(msg));
  }
  ws.on('message', async (data: string) => {
    logger.debug(`received WS msg: ${data}`);
    const callback = (ws as any).onStockData;
    const result = LatestPriceFilterSchema.validate(data);
    if (result.error) {
      return callback({
        errors: result.error.details.map(detail => detail.message),
      });
    }
    const msg = result.value as LatestPriceFilter;
    const symbols = await getSymbolsByFilter(msg.name);
    if (msg.type === 'subscribe') {
      provider.subscribe(symbols, callback);
    } else {
      provider.unsubscribe(symbols, callback);
    }
  });
  ws.on('close', () => {
    logger.debug('WS connection closed');
    provider.unsubscribeAll((ws as any).onStockData);
  });
});


app.get('/prices',
  validator.query(PriceFilterSchema),
  // @ts-ignore
  async (req: ValidatedRequest<PriceFilter>, res) => {
  logger.debug(`prices params: ${req.query}`);
  const filter = {
    timeStart: req.query.start,
    timeEnd: req.query.end,
    high: req.query.high,
    low: req.query.low,
    name: req.query.name,
  };
  const prices = await cache.getStockPrices(filter);
  res.json({
    data: prices,
  });
});


app.get('/stocks',
  validator.query(StockFilterSchema),
  // @ts-ignore
  async (req: ValidatedRequest<StockFilter>, res) => {
  logger.debug(`stocks params: ${req.query}`);
  const stocks = await cache.getStocks(req.query.name);
  res.json({
    data: stocks,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.error && err.error.isJoi) {
    return res.status(400).json({
      errors: err.error.details.map((detail: any) => detail.message),
    });
  }
  logger.error(err);
  return res.status(500);
});

(async () => {
  const ProviderClass = getProvider(config.provider);
  if (!ProviderClass) {
    logger.error(`Unsupported provider '${config.provider}'.`);
    logger.error(`Available providers: "${getSupportedProviders().join('", "')}".`);
    process.exit(1);
  }

  provider = new ProviderClass();
  cache = await StockCache.create(provider);

  app.listen(config.port, () =>
    logger.info(`Server is running on http://localhost:${config.port}`),
  );
})();


