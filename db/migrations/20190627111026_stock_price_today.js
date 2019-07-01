const TABLE_NAME = 'stock_price_today';

exports.up = async (knex) => Promise.all([
  knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('stock_id').unsigned().notNullable();
    table.bigInteger('time');
    table.bigInteger('price');
    // table.primary(['time', 'stock_id']);
    table.index(['time', 'stock_id']);
    table.foreign('stock_id').references('id').inTable('stock');
  }),
]);

exports.down = async (knex) => Promise.all([
  knex.schema.dropTableIfExists(TABLE_NAME),
]);

