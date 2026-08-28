import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthProvider, AuthRequestLike } from '../interfaces/auth-provider.interface';
import { SessionCookieService } from '../session/session-cookie.service';
import { SessionService } from '../session/session.service';

/**
 * AuthProvider berbasis sesi lokal (JWT) — token diterbitkan SessionService
 * (lihat di sana untuk alasan payload minimal). Menggantikan StubAuthProvider
 * setelah endpoint penerbit token tersedia: `dev-login` (header Bearer) dan
 * callback SSO Helpdesk (cookie `session` HttpOnly, 2026-08-27). Kedua jalur
 * berdampingan — lihat `extractToken()` di bawah untuk alasannya.
 *
 * Setiap request memvalidasi ULANG status akun ke DB (isActive, soft-delete) —
 * bukan sekadar signature token — agar penonaktifan akun berlaku seketika, bukan
 * menunggu token lama kedaluwarsa.
 */
@Injectable()
export class SessionAuthProvider implements AuthProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  async resolveUser(request: AuthRequestLike): Promise<CurrentUser | null> {
    const token = this.extractToken(request);
    if (!token) {
      return null;
    }

    const payload = this.sessionService.verify(token);
    if (!payload) {
      return null;
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      opdId: user.opdId,
      ssoSubject: user.ssoSubject,
    };
  }

  /**
   * DUA jalur penyerahan token, dan keduanya memang dibutuhkan (2026-08-27):
   *
   * - Header `Authorization: Bearer` — jalur `dev-login`. Frontend menyimpan
   *   tokennya di localStorage lalu menyematkannya lewat interceptor axios.
   *   Tetap ada karena inilah cara menguji aplikasi tanpa Helpdesk, dan
   *   NonProductionGuard sudah menutupnya di produksi.
   * - Cookie `session` (HttpOnly) — jalur SSO sungguhan. Lihat
   *   SessionCookieService untuk alasan cookie dipilih atas fragment URL.
   *
   * Header didahulukan supaya permintaan yang menyebut tokennya secara EKSPLISIT
   * tak pernah diam-diam dilayani oleh sesi cookie yang kebetulan menempel di
   * peramban -- itu akan membuat galat "token saya salah" tampak seperti berhasil.
   */
  private extractToken(request: AuthRequestLike): string | null {
    const value = request.headers['authorization'];
    const header = Array.isArray(value) ? value[0] : value;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim() || null;
    }

    const cookieHeader = request.headers['cookie'];
    return this.sessionCookie.read(Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader);
  }
}
