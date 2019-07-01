const dotEnv = require('dotenv');
const env = require('env-var');
const path = require('path');

dotEnv.config({path: path.resolve('..', '.env')});

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: env.get('DB_HOST').required().asString(),
      user: env.get('DB_USER').required().asString(),
      password: env.get('DB_PASSWORD').required().asString(),
      database: env.get('DB_NAME').required().asString(),
    },
    migrations: {
      directory: `${__dirname}/migrations`,
    },
    seeds: {
      directory: `${__dirname}/seeds`,
    },
  },
};
