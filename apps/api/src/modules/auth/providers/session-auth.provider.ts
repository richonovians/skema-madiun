import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthProvider, AuthRequestLike } from '../interfaces/auth-provider.interface';
import { SessionService } from '../session/session.service';

/**
 * AuthProvider berbasis sesi lokal (JWT) — token diterbitkan SessionService
 * (lihat di sana untuk alasan payload minimal). Menggantikan StubAuthProvider
 * setelah endpoint penerbit token tersedia (dev-login sekarang, callback SSO nanti);
 * BELUM diaktifkan sebagai AUTH_PROVIDER default (lihat AuthModule).
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
  ) {}

  async resolveUser(request: AuthRequestLike): Promise<CurrentUser | null> {
    const token = this.extractBearerToken(request);
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

  private extractBearerToken(request: AuthRequestLike): string | null {
    const value = request.headers['authorization'];
    const header = Array.isArray(value) ? value[0] : value;
    if (!header || !header.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length).trim();
  }
}
