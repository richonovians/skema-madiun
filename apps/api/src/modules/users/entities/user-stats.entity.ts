import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Hasil `GET /users/stats` — jumlah akun untuk halaman Manajemen User
 * (permintaan pengguna 6 September 2026).
 *
 * Keduanya MENGECUALIKAN akun yang sudah di-soft-delete. Tanpa itu, angka di
 * layar terus bertambah walau akunnya sudah dihapus, dan tak akan pernah cocok
 * dengan jumlah baris pada tabel di halaman yang sama.
 */
export class UserStatsEntity extends BaseEntity<UserStatsEntity> {
  @ApiProperty({ description: 'Seluruh akun yang belum dihapus' })
  totalUsers: number;

  @ApiProperty({ description: 'Akun yang belum dihapus DAN berstatus aktif' })
  activeUsers: number;
}
