import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

export interface SessionPayload {
  sub: number; // userId
  /**
   * Peran yang DIPILIH pemilik sesi (5 September 2026). Opsional: akun ber-role
   * tunggal tak perlu memilih apa pun.
   *
   * Menyimpan pilihan ini di token TIDAK melanggar keputusan "payload minimal"
   * di bawah. Yang tak boleh dipercaya dari token adalah KEPEMILIKAN role, dan
   * itu tetap dibaca ulang dari basis data pada setiap permintaan; klaim ini
   * hanya menyatakan PILIHAN, lalu disaring oleh kepemilikan itu
   * (`resolveActingRole`). Karena itu mencabut role tetap berlaku seketika.
   */
  act?: Role;
}

/**
 * Terbitkan & verifikasi token sesi lokal (JWT) — SKM menerbitkan sesinya sendiri
 * setelah login berhasil (dev-login sekarang, callback SSO OAuth2 nanti), sesuai
 * keputusan arsitektur: identitas dari IdP eksternal, sesi tetap milik SKM sendiri.
 *
 * Payload SENGAJA minimal (hanya `sub`=userId) — role/opdId/isActive selalu diambil
 * ULANG dari DB saat verifikasi (lihat SessionAuthProvider), bukan dipercaya dari
 * klaim token. Ini mencegah perubahan role/penonaktifan akun baru berlaku setelah
 * token lama kedaluwarsa — penting untuk sistem RBAC administratif seperti ini.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly jwtService: JwtService) {}

  issue(userId: number, act?: Role): string {
    return this.jwtService.sign(act ? { sub: userId, act } : { sub: userId });
  }

  /**
   * `sub` WAJIB berupa angka (2026-08-27). Sejak SsoStateService ikut
   * menandatangani token dengan kunci yang SAMA, ada JWT sah-tanda-tangan yang
   * BUKAN token sesi (token `state` berpayload `{ typ: 'sso_state', n }`).
   * Tanpa pemeriksaan ini, token semacam itu lolos verifikasi lalu diteruskan
   * ke `prisma.user.findUnique({ where: { id: undefined } })` dan meledak jadi
   * 500 -- bukan celah akses, tapi galat yang menyesatkan. Ditolak di sini
   * supaya jawabannya 401 yang jujur.
   */
  verify(token: string): SessionPayload | null {
    try {
      const payload = this.jwtService.verify<Partial<SessionPayload>>(token);
      if (typeof payload?.sub !== 'number') {
        this.logger.debug('Token bertanda-tangan sah tapi bukan token sesi (sub bukan angka)');
        return null;
      }
      // `act` yang bukan anggota enum DIABAIKAN, bukan membatalkan tokennya.
      // Hasilnya sama dengan "belum memilih" -- keadaan yang sudah ditangani
      // resolveActingRole dengan jujur -- sedangkan menolak seluruh tokennya
      // akan melaporkan "sesi tak sah" untuk sesi yang sebenarnya sah.
      const act =
        typeof payload.act === 'string' && (Object.values(Role) as string[]).includes(payload.act)
          ? (payload.act as Role)
          : undefined;
      return act ? { sub: payload.sub, act } : { sub: payload.sub };
    } catch (err) {
      this.logger.debug(`Token sesi tidak valid/kedaluwarsa: ${String(err)}`);
      return null;
    }
  }
}
