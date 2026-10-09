import { Injectable } from '@nestjs/common';
import type { PenyimpanCabutLampiran } from './penyimpan-cabut-lampiran.interface';

/**
 * Penyimpan pencabutan DALAM MEMORI, untuk pengembangan dan uji saja.
 *
 * SENGAJA BUKAN "nonaktif" seperti pada singgahan. Penyimpan singgahan yang
 * mati hanya membuat jawaban lebih lambat, sedangkan penyimpan pencabutan yang
 * mati membuat pencabutan DIAM-DIAM TAK BERLAKU. Karena itu di sini selalu ada
 * implementasi yang sungguh menyimpan, dan gerbang boot yang menolak produksi
 * tanpa `REDIS_URL` tetap menjadi penjaga sebenarnya.
 *
 * BATASNYA sama dengan penyimpan sesi dalam memori: dua pekerja API punya `Map`
 * masing-masing, jadi pencabutan di satu pekerja tak terlihat oleh yang lain.
 * Itu sebabnya ia tak boleh dipakai di produksi.
 */
@Injectable()
export class PenyimpanCabutLampiranMemori implements PenyimpanCabutLampiran {
  private readonly catatan = new Map<number, { pada: number; sampai: number }>();

  constructor(private readonly ttlDetik: number) {}

  private static get sekarang(): number {
    return Math.floor(Date.now() / 1000);
  }

  async cabut(uid: number, padaDetik: number): Promise<void> {
    this.catatan.set(uid, {
      pada: padaDetik,
      sampai: PenyimpanCabutLampiranMemori.sekarang + this.ttlDetik,
    });
  }

  async dicabutPada(uid: number): Promise<number | null> {
    const baris = this.catatan.get(uid);
    if (!baris) {
      return null;
    }
    // Dipangkas saat dibaca, pola sama dengan `PenyimpanSesiMemori`: tanpa ini
    // catatannya hidup selamanya dan `Map`-nya tumbuh tanpa batas.
    if (baris.sampai <= PenyimpanCabutLampiranMemori.sekarang) {
      this.catatan.delete(uid);
      return null;
    }
    return baris.pada;
  }
}
