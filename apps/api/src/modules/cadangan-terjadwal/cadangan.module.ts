import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CadanganTerjadwalService } from './cadangan-terjadwal.service';

/**
 * Cadangan harian terjadwal (BUG-073, 12 November 2026).
 *
 * Tanpa controller dan tanpa ekspor: cadangan tak boleh dipicu dari permintaan
 * HTTP mana pun. Perintah tangannya tetap `pnpm cadangan`.
 */
@Module({
  imports: [NotificationsModule],
  providers: [CadanganTerjadwalService],
})
export class CadanganModule {}
