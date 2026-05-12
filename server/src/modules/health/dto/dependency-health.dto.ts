// src/modules/health/dto/dependency-health.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DependencyHealthDto {
  @ApiProperty({ example: 'redis' })
  name!: string;

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  status!: 'up' | 'down';

  @ApiProperty({ required: false, example: 5 })
  latencyMs?: number;

  @ApiProperty({ required: false, example: 'OK' })
  message?: string;

  @ApiProperty({ required: false, example: '6.2.0' })
  version?: string;
}
