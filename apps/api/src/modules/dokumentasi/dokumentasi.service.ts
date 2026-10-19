import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Pembentuk dokumen OpenAPI. Disuntik sebagai FUNGSI, bukan sebagai
 * `INestApplication`, supaya service ini dapat diuji tanpa memboot Nest.
 */
export type PembangunDokumen = () => OpenAPIObject;

/**
 * Penampung dokumen OpenAPI, DIBANGUN MALAS.
 *
 * MENGAPA MALAS. `SwaggerModule.createDocument` memindai seluruh controller.
 * Ada ~30 berkas e2e yang masing-masing memboot aplikasi dan hampir semuanya
 * tak pernah menyentuh endpoint ini; membangun dokumen di setiap boot berarti
 * membayar pemindaian itu tanpa ada yang memakainya.
 *
 * MENGAPA DISIMPAN. Dokumennya tak berubah selama proses hidup -- ia diturunkan
 * dari kode, bukan dari data.
 *
 * MENGAPA BUKAN MENERIMA `INestApplication`. Pembangunan dokumen menuntut rute
 * sudah terdaftar, yang baru terjadi saat `app.init()`. Dengan menyimpan
 * closure, pendaftaran dapat dilakukan di `configureApp()` sementara
 * pembangunannya menunggu sampai ada yang benar-benar meminta.
 */
@Injectable()
export class DokumentasiService {
  private pembangun: PembangunDokumen | null = null;
  private dokumen: OpenAPIObject | null = null;

  daftarkanPembangun(pembangun: PembangunDokumen): void {
    this.pembangun = pembangun;
  }

  ambilDokumen(): OpenAPIObject {
    if (this.dokumen) {
      return this.dokumen;
    }
    if (!this.pembangun) {
      // Gagal nyaring, bukan mengembalikan dokumen kosong: dokumen kosong
      // terbaca seperti "API ini tak punya endpoint", dan itu menyesatkan
      // pembacanya alih-alih memberi tahu bahwa ada yang rusak.
      throw new ServiceUnavailableException(
        'Dokumen OpenAPI belum siap: pembangunnya belum terdaftar di configureApp().',
      );
    }
    this.dokumen = this.pembangun();
    return this.dokumen;
  }
}
