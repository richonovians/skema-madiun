import { Injectable } from '@nestjs/common';
import type { PenyimpanSinggahan } from './penyimpan-singgahan.interface';

/**
 * `PenyimpanSinggahan` yang tak menyimpan apa pun -- dipakai saat `REDIS_URL`
 * kosong. `ambil` selalu meleset dan `simpan` tak melakukan apa-apa, sehingga
 * pemakainya menghitung ulang tiap permintaan, persis seperti sebelum singgahan
 * ada. Dengan begitu lingkungan pengembangan tanpa Redis tak berubah perilaku,
 * dan uji tak menuntut layanan hidup.
 *
 * SENGAJA BUKAN singgahan dalam memori: di produksi dua pekerja API punya
 * `Map` masing-masing, jadi singgahan memori hanya menyamarkan ketiadaan Redis
 * alih-alih menampakkannya. Produksi memang menolak boot tanpa `REDIS_URL`
 * (periksaPenyimpanSesi), jadi implementasi ini hanya pernah hidup di dev.
 */
@Injectable()
export class PenyimpanSinggahanNonaktif implements PenyimpanSinggahan {
  async ambil<T>(): Promise<T | null> {
    return null;
  }

  async simpan(): Promise<void> {
    // sengaja kosong
  }

  async hapus(): Promise<void> {
    // sengaja kosong
  }
}
