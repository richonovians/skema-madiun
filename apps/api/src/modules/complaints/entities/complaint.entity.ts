import { ComplaintStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ComplaintAttachmentEntity } from './complaint-attachment.entity';

export class ComplaintEntity extends BaseEntity<ComplaintEntity> {
  id: number;
  ticketNo: string;
  /**
   * DIHILANGKAN seluruhnya pada pengaduan anonim (bukan `null`/`0`). Nilai apa
   * pun yang tetap dikirim membuka celah bagi kode klien yang kelak membacanya
   * tanpa memeriksa `isAnonim`.
   */
  userId?: number;
  /**
   * `null` berarti pengaduan ini BELUM BERTUJUAN — pengirimnya tak tahu harus
   * ditujukan kepada siapa (6 September 2026). Superuser/Admin Kabupaten
   * mengisinya lewat `PATCH /complaints/:id/opd`.
   */
  opdId: number | null;
  kategori: string;
  judul: string;
  uraian: string;
  status: ComplaintStatus;
  /**
   * Pengaduan dikirim tanpa identitas. Bukan data identitas, jadi TETAP dikirim
   * ke admin -- justru inilah yang memberi tahu antarmuka untuk menampilkan
   * "Anonim" alih-alih tanda hubung tanpa keterangan.
   */
  isAnonim: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachments?: ComplaintAttachmentEntity[];
  /** Nama pelapor. Hanya diisi pada `GET /complaints` (INT-11). */
  reporterNama?: string;
  /** Nama OPD tujuan. Diisi pada `GET /complaints` & `GET /complaints/:ticketNo` (INT-18). */
  opdNama?: string;
}
