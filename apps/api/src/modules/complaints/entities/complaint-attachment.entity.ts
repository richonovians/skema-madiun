import { BaseEntity } from '../../../common/entities/base.entity';

/** Lampiran (foto/dokumen) pada sebuah pengaduan. */
export class ComplaintAttachmentEntity extends BaseEntity<ComplaintAttachmentEntity> {
  id: number;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}
