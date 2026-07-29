import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class ReorderQuestionsDto {
  @ApiProperty({ type: [Number], description: 'Seluruh id pertanyaan survei dalam urutan baru' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  orderedIds: number[];
}
