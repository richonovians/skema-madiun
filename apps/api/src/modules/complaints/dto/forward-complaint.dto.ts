import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Body `PATCH /complaints/:id/opd` — meneruskan pengaduan yang belum bertujuan
 * ke OPD yang berwenang (6 September 2026).
 *
 * `opdId` WAJIB dan tak boleh null: endpoint ini justru ada untuk MENGISI
 * tujuan. Mengosongkan kembali tujuan sebuah pengaduan bukan alur yang diminta,
 * dan membiarkannya berarti tiket bisa dikembalikan ke antrean triase setelah
 * OPD-nya mulai menangani.
 */
export class ForwardComplaintDto {
  @ApiProperty({ description: 'Id OPD yang berwenang menangani pengaduan ini' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId: number;
}
