import { BaseEntity } from '../../../common/entities/base.entity';
import { ComplaintAttachmentEntity } from './complaint-attachment.entity';

/** Satu tanggapan dalam riwayat percakapan pengaduan. */
export class ComplaintReplyEntity extends BaseEntity<ComplaintReplyEntity> {
  id: number;
  complaintId: number;
  /** Dihilangkan pada balasan yang ditulis pelapor anonim; balasan admin tetap membawanya. */
  authorId?: number;
  pesan: string;
  createdAt: Date;
  // Lampiran opsional pada balasan (2026-08-06, laporan bug user "tidak bisa
  // mengirim dokumen/foto di chat") -- selalu array, kosong bila tak ada.
  attachments: ComplaintAttachmentEntity[];
}
