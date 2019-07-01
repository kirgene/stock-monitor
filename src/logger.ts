import * as winston from 'winston';
import config from './config';

const logger = winston.createLogger({
  level: config.isDebug ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(), // winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});


export default logger;
