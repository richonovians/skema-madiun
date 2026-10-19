import { Module } from '@nestjs/common';
import { AuditRetensiService } from './audit-retensi.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  // AuditRetensiService TIDAK diekspor: pemangkasan tak boleh dipanggil dari
  // modul lain. Ia berjalan sendiri lewat penjadwalnya, atau lewat skrip
  // `pnpm pangkas:audit` yang membangun konteks Nest-nya sendiri.
  providers: [AuditService, AuditRetensiService],
  exports: [AuditService],
})
export class AuditModule {}
