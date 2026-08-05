import { Module } from '@nestjs/common';
import { OpdController } from './opd.controller';
import { OpdService } from './opd.service';
import { OPD_SOURCE } from './opd.constants';
import { HelpdeskOpdClient } from './providers/helpdesk-opd.client';
import { StubOpdSource } from './providers/stub-opd-source';

@Module({
  controllers: [OpdController],
  providers: [
    OpdService,
    StubOpdSource,
    HelpdeskOpdClient,
    // HelpdeskOpdClient sekarang default (integrasi nyata sudah ada, INT-HD-1).
    // StubOpdSource tetap terdaftar utk e2e (lihat opd.e2e-spec.ts, override eksplisit)
    // & sbg fallback offline dev kalau kredensial Helpdesk belum di-.env lokal.
    { provide: OPD_SOURCE, useExisting: HelpdeskOpdClient },
  ],
  exports: [OpdService, OPD_SOURCE],
})
export class OpdModule {}
