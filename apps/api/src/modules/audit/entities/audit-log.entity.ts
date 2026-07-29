import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu catatan aktivitas admin (siapa mengubah apa, kapan). */
export class AuditLogEntity extends BaseEntity<AuditLogEntity> {
  id: number;
  actorId: number;
  actorNama: string;
  aksi: string;
  entitas: string;
  detail: unknown;
  timestamp: Date;
}
