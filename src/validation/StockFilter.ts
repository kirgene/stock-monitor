import * as Joi from '@hapi/joi';
import  'joi-extract-type';
import {
  ValidatedRequestSchema,
  ContainerTypes,
} from 'express-joi-validation';


export const StockFilterSchema = Joi.object({
  name: Joi.array().items(Joi.string()),
}).with('start', 'end');

export interface StockFilter extends ValidatedRequestSchema {
  [ContainerTypes.Query]: Joi.extractType<typeof StockFilterSchema>;
}
