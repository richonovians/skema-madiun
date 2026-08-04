import { ComplaintStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ComplaintAttachmentEntity } from './complaint-attachment.entity';

export class ComplaintEntity extends BaseEntity<ComplaintEntity> {
  id: number;
  ticketNo: string;
  userId: number;
  opdId: number;
  kategori: string;
  judul: string;
  uraian: string;
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
  attachments?: ComplaintAttachmentEntity[];
  /** Nama pelapor. Hanya diisi pada `GET /complaints` (INT-11). */
  reporterNama?: string;
  /** Nama OPD tujuan. Diisi pada `GET /complaints` & `GET /complaints/:ticketNo` (INT-18). */
  opdNama?: string;
}
