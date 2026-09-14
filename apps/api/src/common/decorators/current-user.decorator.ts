import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Bentuk identitas pengguna aktif — SAMA baik dihasilkan StubAuthProvider (dev)
 * maupun SsoAuthProvider (nanti), sehingga modul bisnis tak berubah saat SSO aktif.
 *
 * Di-co-locate dengan param decorator agar keduanya dipakai lewat satu impor:
 *   `@CurrentUser() user: CurrentUser`
 */
export interface CurrentUser {
  userId: number;
  /**
   * SELURUH role yang dimiliki akun, menurut basis data. Ini KEPEMILIKAN.
   *
   * JANGAN dipakai untuk keputusan hak akses -- pemakaian sahnya hanya dua:
   * (a) ditampilkan kepada pemiliknya, dan (b) memvalidasi permintaan ganti
   * peran (`AuthService.setActingRole`).
   */
  roles: Role[];
  /**
   * Peran yang SEDANG DIPAKAI pada sesi ini. INILAH yang menentukan hak akses,
   * bukan `roles`.
   *
   * Berasal dari klaim `act` di token, disaring oleh kepemilikan di basis data
   * -- lihat `resolveActingRole` di modules/auth/acting-role.util.ts untuk
   * aturan lengkapnya beserta alasan setiap cabangnya.
   */
  actingRole: Role;
  opdId: number | null;
  ssoSubject?: string;
}

/** Param decorator: mengambil pengguna aktif dari request (diisi oleh RolesGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | undefined =>
    ctx.switchToHttp().getRequest<{ user?: CurrentUser }>().user,
);
