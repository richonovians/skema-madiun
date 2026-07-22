import { Module } from '@nestjs/common';
import { OpdController } from './opd.controller';
import { OpdService } from './opd.service';
import { OPD_SOURCE } from './opd.constants';
import { StubOpdSource } from './providers/stub-opd-source';

@Module({
  controllers: [OpdController],
  providers: [
    OpdService,
    StubOpdSource,
    // Ganti StubOpdSource → HelpdeskOpdClient saat spec Helpdesk tersedia.
    { provide: OPD_SOURCE, useExisting: StubOpdSource },
  ],
  exports: [OpdService, OPD_SOURCE],
})
export class OpdModule {}
