import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { DokumentasiController } from './dokumentasi.controller';
import { DokumentasiService } from './dokumentasi.service';

@Module({
  // `DiscoveryModule` menyediakan `DiscoveryService`, yang dipakai
  // `anotasiRute` untuk menelusuri controller dan membaca metadata `@Roles`,
  // `@Public`, dan `@Throttle` yang sesungguhnya ditegakkan guard.
  imports: [DiscoveryModule],
  controllers: [DokumentasiController],
  providers: [DokumentasiService],
  // DIEKSPOR supaya `configureApp()` di app.setup.ts dapat mengambil instansnya
  // lewat `app.get(DokumentasiService)` untuk mendaftarkan pembangun dokumen.
  exports: [DokumentasiService],
})
export class DokumentasiModule {}
