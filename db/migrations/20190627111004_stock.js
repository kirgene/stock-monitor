const TABLE_NAME = 'stock';

exports.up = async (knex) => Promise.all([
  knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('symbol').unique().notNullable();
  }),
]);

exports.down = async (knex) => Promise.all([
  knex.schema.dropTableIfExists(TABLE_NAME),
]);
