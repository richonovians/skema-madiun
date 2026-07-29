import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu tanggapan dalam riwayat percakapan pengaduan. */
export class ComplaintReplyEntity extends BaseEntity<ComplaintReplyEntity> {
  id: number;
  complaintId: number;
  authorId: number;
  pesan: string;
  createdAt: Date;
}
