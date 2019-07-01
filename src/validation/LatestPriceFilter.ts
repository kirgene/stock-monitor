import * as Joi from '@hapi/joi';
import  'joi-extract-type';

export const LatestPriceFilterSchema = Joi.object({
  name: Joi.array().items(Joi.string()),
  type: Joi.string().valid(['subscribe', 'unsubscribe']),
});

export type LatestPriceFilter = Joi.extractType<typeof LatestPriceFilterSchema>;
