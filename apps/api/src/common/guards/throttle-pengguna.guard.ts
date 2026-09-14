import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
} from '@nestjs/throttler';
import { AUTH_PROVIDER } from '../../modules/auth/auth.constants';
import type {
  AuthProvider,
  AuthRequestLike,
} from '../../modules/auth/interfaces/auth-provider.interface';

/**
 * Batas laju dihitung per PENGGUNA bila permintaan membawa sesi, per IP bila
 * tidak (14 September 2026).
 *
 * Bawaan ThrottlerGuard memakai `req.ip` untuk semua orang. Dua akibatnya
 * berlawanan arah, dan keduanya buruk:
 *
 * - satu akun yang berganti-ganti jaringan mendapat penghitung baru tiap ganti
 *   IP, sehingga batas apa pun tak pernah tersentuh olehnya;
 * - sebaliknya, seluruh pengunjung satu WiFi loket berbagi satu penghitung,
 *   sehingga orang yang tak melakukan apa-apa ikut kena 429.
 *
 * KENAPA `identitasRingan`, BUKAN `req.user`: guard ini berjalan LEBIH DULU
 * daripada RolesGuard, jadi `req.user` masih kosong di sini. Itu diukur, bukan
 * dikira -- percobaan pertama memakai `req.user` dan ujinya tetap merah dengan
 * angka yang persis sama. Urutan itu justru sifat yang diinginkan: bila
 * penghitungnya berjalan SESUDAH autentikasi, banjir permintaan bertoken palsu
 * akan ditolak 401 tanpa pernah memakai kuota sama sekali.
 *
 * `identitasRingan` karena itu hanya memverifikasi TANDA TANGAN token, tanpa
 * menyentuh basis data. Membaca ulang penggunanya di sini akan menggandakan
 * satu kueri pada setiap permintaan demi sebuah kunci penghitung.
 *
 * IP TETAP dipakai untuk permintaan tanpa kredensial. Di sana tak ada identitas
 * lain yang dapat dipercaya, dan menjatuhkan semuanya ke satu ember bersama
 * akan mengubah batas jalur publik menjadi batas global.
 */
@Injectable()
export class ThrottlePenggunaGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    // Token yang cacat tak boleh menjatuhkan permintaannya di sini: penolakan
    // itu tugas RolesGuard, yang menjawabnya 401 dengan pesan yang benar.
    let userId: number | null = null;
    try {
      userId = this.authProvider.identitasRingan(req as unknown as AuthRequestLike);
    } catch {
      userId = null;
    }

    // Berawalan, supaya id pengguna 5 dan IP "5" tak mungkin bertabrakan.
    return Promise.resolve(userId != null ? `pengguna:${userId}` : `ip:${String(req.ip)}`);
  }
}
