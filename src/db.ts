import * as knex from 'knex';
import config from './config';

export interface KnexEx extends knex {
  createTransaction(): Promise<knex.Transaction>;
}

async function init(): Promise<KnexEx> {
  const knexConfig = {
    client: 'postgresql',
    connection: {
      host: config.db.host,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
  };

  const db = knex({
    ...knexConfig,
    pool: {
      afterCreate: (conn: any, done: any) => {
        done(null, conn);
      },
    },
  });

  Object.defineProperty(db,
    'createTransaction', {
      value: async () => new Promise(resolve => db.transaction(resolve)),
      writable: false,
    });

  return db as KnexEx;
}

const instance = init();

export { knex };

export async function getInstance(): Promise<KnexEx> { return instance; }
