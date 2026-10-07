import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PENYIMPAN_SESI } from './penyimpan-sesi.interface';
import type { PenyimpanSesi } from './penyimpan-sesi.interface';
import { SessionService } from './session.service';

/**
 * Satu pintu untuk menerbitkan sesi: token ditandatangani DAN didaftarkan ke
 * daftar pencabutan dalam satu langkah.
 *
 * ADA TIGA TEMPAT yang menerbitkan sesi (dev-login, callback SSO, pergantian
 * peran). Membiarkan ketiganya memanggil `issue()` lalu `simpan()`
 * sendiri-sendiri berarti cepat atau lambat salah satunya lupa mendaftar, dan
 * karena pemeriksaan sesi GAGAL TERTUTUP akibatnya bukan sekadar sesi yang tak
 * dapat dicabut, melainkan orang yang tak dapat masuk sama sekali.
 *
 * `SessionService` sengaja TIDAK diberi tahu soal penyimpan: ia murni urusan
 * JWT, tetap sinkron, dan tetap dapat diuji tanpa penyimpan apa pun.
 */
@Injectable()
export class PenerbitSesi {
  constructor(
    private readonly sessionService: SessionService,
    @Inject(PENYIMPAN_SESI) private readonly penyimpan: PenyimpanSesi,
  ) {}

  async terbitkan(
    userId: number,
    act?: Role,
    perangkat?: { ua?: string; ip?: string },
  ): Promise<string> {
    const token = this.sessionService.issue(userId, act);
    const payload = this.sessionService.verify(token);
    // Keduanya mustahil pada token yang baru saja kita tandatangani sendiri.
    // Diperiksa supaya kegagalannya berbunyi di sini, bukan menjadi catatan
    // tanpa pagu yang hidup selamanya di penyimpan.
    if (!payload?.sid || typeof payload.abs !== 'number') {
      throw new Error('Token sesi yang baru diterbitkan tidak membawa sid/abs');
    }
    // Pagu DIBACA dari token, bukan dihitung ulang. Menghitungnya dua kali dari
    // sumber yang sama membuka peluang catatan hidup lebih lama daripada
    // tokennya begitu satu tempat diubah dan yang lain terlupa; alasan yang
    // sama sudah tertulis di SessionCookieService soal `Max-Age`.
    await this.penyimpan.simpan(payload.sid, {
      uid: userId,
      abs: payload.abs,
      ...(perangkat?.ua ? { ua: perangkat.ua } : {}),
      ...(perangkat?.ip ? { ip: perangkat.ip } : {}),
    });
    return token;
  }
}
