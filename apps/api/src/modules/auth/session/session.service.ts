import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SessionPayload {
  sub: number; // userId
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

  issue(userId: number): string {
    return this.jwtService.sign({ sub: userId });
  }

  verify(token: string): SessionPayload | null {
    try {
      return this.jwtService.verify<SessionPayload>(token);
    } catch (err) {
      this.logger.debug(`Token sesi tidak valid/kedaluwarsa: ${String(err)}`);
      return null;
    }
  }
}
