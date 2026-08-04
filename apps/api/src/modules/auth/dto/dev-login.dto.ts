import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DevLoginDto {
  @ApiProperty({ description: 'Email atau ssoSubject pengguna seed yang sudah ada' })
  @IsString()
  @MinLength(1)
  identifier: string;
}
