import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateInsightDto {
  @ApiProperty({ maxLength: 2000, description: 'Narasi analisis /statistics (D6)' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}
