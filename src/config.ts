import { config as loadDotEnv } from 'dotenv';
import * as env from 'env-var';

loadDotEnv();

export default {
  port: env.get('PORT').required().asInt(),
  db: {
    host: env.get('DB_HOST').required().asString(),
    name: env.get('DB_NAME').required().asString(),
    user: env.get('DB_USER').required().asString(),
    password: env.get('DB_PASSWORD').required().asString(),
  },
  version: env.get('VERSION').required().asString(),
  provider: env.get('PROVIDER').required().asString(),
  isDebug: env.get('DEBUG', 'false').asBool(),
};
