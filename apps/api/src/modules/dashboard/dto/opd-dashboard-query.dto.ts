import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class OpdDashboardQueryDto {
  /**
   * OPD yang ingin dilihat (2026-08-20, permintaan user: superuser dapat membuka
   * dashboard OPD).
   *
   * HANYA berlaku untuk `superuser`, dan wajib diisi olehnya -- akun superuser
   * tak tertaut OPD mana pun sehingga tak ada OPD yang bisa disimpulkan sendiri.
   *
   * Admin OPD: field ini DIABAIKAN sepenuhnya (backend selalu memakai OPD akunnya
   * sendiri), jadi tak ada jalan bagi akun OPD mengintip OPD lain.
   * Admin Kabupaten: TIDAK diizinkan membuka dashboard ini sama sekali, dengan
   * atau tanpa field ini -- lihat `DashboardService.resolveDashboardOpdId`.
   */
  @ApiPropertyOptional({
    description: 'OPD yang dilihat — hanya untuk Superuser, dan wajib olehnya',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;
}
