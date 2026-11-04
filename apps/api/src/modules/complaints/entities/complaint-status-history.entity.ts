import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu perpindahan status pada sebuah pengaduan (4 November 2026). */
export class ComplaintStatusHistoryEntity extends BaseEntity<ComplaintStatusHistoryEntity> {
  id: number;

  @ApiProperty({ enum: ComplaintStatus })
  status: ComplaintStatus;

  /**
   * Nama status yang dibaca orang, dikirim JADI dari backend.
   *
   * Frontend memang punya petanya sendiri (`enumLabels.js`) untuk status
   * berjalan, tetapi riwayat dapat memuat status yang kelak ditambahkan
   * backend lebih dulu -- dan baris tanpa label jauh lebih buruk di sini
   * daripada di sebuah lencana, karena ia merusak urutan cerita.
   */
  label: string;

  /**
   * Catatan petugas, SUDAH TERDEKRIPSI. `null` berarti perpindahan ini memang
   * tanpa catatan -- lazim pada tahap yang tak menuntut penjelasan.
   */
  catatan: string | null;

  /**
   * `null` berarti SISTEM, bukan "tak diketahui" -- baris `terkirim` tak punya
   * petugas. Tampilan memakai perbedaan itu untuk menulis "Otomatis".
   */
  @ApiPropertyOptional({ nullable: true })
  actorNama: string | null;

  createdAt: Date;
}
