import * as Joi from '@hapi/joi';
import  'joi-extract-type';
import {ContainerTypes, ValidatedRequestSchema} from 'express-joi-validation';

export const LatestPriceFilterSchema = Joi.object({
  name: Joi.array().items(Joi.string()),
  type: Joi.string().valid(['subscribe', 'unsubscribe']),
});

export type LatestPriceFilter = Joi.extractType<typeof LatestPriceFilterSchema>;
