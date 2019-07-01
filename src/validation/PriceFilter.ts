import * as Joi from '@hapi/joi';
import  'joi-extract-type';
import {
  ValidatedRequestSchema,
  ContainerTypes,
} from 'express-joi-validation';


export const PriceFilterSchema = Joi.object({
  start: Joi.date().iso(),
  end: Joi.date().iso(),
  high: Joi.number().positive(),
  low: Joi.number().positive().less(Joi.ref('high')),
  name: Joi.array().items(Joi.string()),
}).with('start', 'end');

export interface PriceFilter extends ValidatedRequestSchema {
  [ContainerTypes.Query]: Joi.extractType<typeof PriceFilterSchema>;
}
