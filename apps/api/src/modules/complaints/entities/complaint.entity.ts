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
}
