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
  role: Role;
  opdId: number | null;
  ssoSubject?: string;
}

/** Param decorator: mengambil pengguna aktif dari request (diisi oleh RolesGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | undefined =>
    ctx.switchToHttp().getRequest<{ user?: CurrentUser }>().user,
);
