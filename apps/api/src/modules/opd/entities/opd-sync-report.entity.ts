import { BaseEntity } from '../../../common/entities/base.entity';

/** Ringkasan hasil satu operasi sinkronisasi OPD dari Helpdesk. */
export class OpdSyncReport extends BaseEntity<OpdSyncReport> {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  durationMs: number;
  syncedAt: Date;
}
