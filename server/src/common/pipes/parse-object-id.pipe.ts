// src/common/pipes/parse-object-id.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ERROR_CODES } from '@common/constants/error-codes.const';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<
  string,
  Types.ObjectId
> {
  transform(value: string): Types.ObjectId {
    const isValid = Types.ObjectId.isValid(value);

    if (!isValid) {
      // Tuân thủ Mục 6: Trả về error code chuẩn VAL_002
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        error: {
          code: ERROR_CODES.INVALID_OBJECT_ID,
          message: 'Invalid ObjectId format',
          details: { value },
        },
      });
    }

    return Types.ObjectId.createFromHexString(value);
  }
}
