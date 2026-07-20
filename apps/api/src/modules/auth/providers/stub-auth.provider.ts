import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthProvider, AuthRequestLike } from '../interfaces/auth-provider.interface';

/**
 * Implementasi SEMENTARA (stub) dari AuthProvider untuk pengembangan.
 * Mengembalikan CurrentUser dengan bentuk yang SAMA seperti hasil SSO nanti,
 * sehingga dapat ditukar ke SsoAuthProvider tanpa mengubah modul bisnis / guard.
 *
 * Peran dapat disimulasikan lewat header dev (opsional):
 *   x-dev-user-id, x-dev-role, x-dev-opd-id, x-dev-sso-subject
 *
 * BUKAN autentikasi nyata — tidak ada JWT/OIDC/Helpdesk di sini.
 */
@Injectable()
export class StubAuthProvider implements AuthProvider {
  resolveUser(request: AuthRequestLike): Promise<CurrentUser | null> {
    const header = (name: string): string | undefined => {
      const value = request.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    const role = (header('x-dev-role') as Role | undefined) ?? Role.kabupaten;
    const opdIdRaw = header('x-dev-opd-id');

    const user: CurrentUser = {
      userId: Number(header('x-dev-user-id') ?? '1'),
      role,
      opdId: opdIdRaw ? Number(opdIdRaw) : null,
      ssoSubject: header('x-dev-sso-subject') ?? `stub-${role}`,
    };

    return Promise.resolve(user);
  }
}
