import { ServiceUnavailableException } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DokumentasiService } from './dokumentasi.service';

const dokumenPalsu = (): OpenAPIObject =>
  ({ openapi: '3.0.0', info: { title: 'uji', version: '1' }, paths: {} }) as OpenAPIObject;

describe('DokumentasiService', () => {
  /**
   * DIBANGUN SEKALI adalah inti tugas service ini. `createDocument` memindai
   * SELURUH controller; memanggilnya pada tiap permintaan berarti membayar
   * pemindaian itu berulang untuk dokumen yang tak pernah berubah selama proses
   * hidup -- ia diturunkan dari kode, bukan dari data.
   */
  it('memanggil pembangun sekali saja walau diminta berkali-kali', () => {
    const service = new DokumentasiService();
    const pembangun = jest.fn(dokumenPalsu);
    service.daftarkanPembangun(pembangun);

    const pertama = service.ambilDokumen();
    const kedua = service.ambilDokumen();

    expect(pembangun).toHaveBeenCalledTimes(1);
    expect(kedua).toBe(pertama);
  });

  /**
   * Pembangun didaftarkan `configureApp()`. Bila suatu saat pendaftaran itu
   * hilang -- misalnya seseorang memindahkannya ke `main.ts`, yang tidak dipakai
   * e2e -- endpoint harus GAGAL NYARING, bukan mengembalikan dokumen kosong.
   * Dokumen kosong terbaca seperti "API ini tak punya endpoint", dan itu
   * menyesatkan pembacanya alih-alih memberi tahu bahwa ada yang rusak.
   */
  it('melempar bila pembangun belum terdaftar', () => {
    const service = new DokumentasiService();

    expect(() => service.ambilDokumen()).toThrow(ServiceUnavailableException);
  });
});
