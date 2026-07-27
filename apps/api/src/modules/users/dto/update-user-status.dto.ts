import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Aktifkan (true) atau nonaktifkan (false) akun' })
  @IsBoolean()
  isActive: boolean;
}
