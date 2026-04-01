// src/common/decorators/object-id-param.decorator.ts
import { Param } from '@nestjs/common';
import { ParseObjectIdPipe } from '../pipes/parse-object-id.pipe';

export const ObjectIdParam = (field: string = 'id') =>
  Param(field, new ParseObjectIdPipe());
