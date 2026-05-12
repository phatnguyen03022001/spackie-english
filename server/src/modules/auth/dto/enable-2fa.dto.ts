// src/modules/auth/dto/enable-2fa.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faResponseDto {
  @ApiProperty({ description: 'Base32 encoded secret' })
  secret!: string;

  @ApiProperty({ description: 'OTP Auth URL for QR code generation' })
  otpauthUrl!: string;

  @ApiProperty({ type: [String], description: 'Recovery codes (show once)' })
  recoveryCodes!: string[];
}

export class Verify2faDto {
  @ApiProperty({ example: '123456' })
  otp!: string;
}

export class Disable2faDto {
  @ApiProperty({ example: '123456' })
  otp!: string;
}

export class RecoveryCodeDto {
  @ApiProperty({ example: 'ABCD-EFGH-IJKL-MNOP' })
  code!: string;
}
