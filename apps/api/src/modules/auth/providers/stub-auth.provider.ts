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
 *   x-dev-user-id, x-dev-role, x-dev-roles, x-dev-opd-id, x-dev-sso-subject
 *
 * BUKAN autentikasi nyata — tidak ada JWT/OIDC/Helpdesk di sini.
 *
 * PERINGATAN yang perlu diingat saat menulis e2e: permintaan TANPA header apa
 * pun diperlakukan sebagai `kabupaten`, sehingga di NODE_ENV=test seluruh
 * endpoint menjawab 200 tanpa kredensial. Uji "bisa diakses tanpa sesi" tak
 * membuktikan apa pun di lingkungan ini -- paksa NODE_ENV='development' bila
 * yang diuji adalah gerbangnya sendiri.
 */
@Injectable()
export class StubAuthProvider implements AuthProvider {
  resolveUser(request: AuthRequestLike): Promise<CurrentUser | null> {
    const header = (name: string): string | undefined => {
      const value = request.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    // `x-dev-role` kini berarti peran yang SEDANG DIPAKAI -- padanan klaim
    // `act` pada jalur sesi sungguhan.
    const actingRole = (header('x-dev-role') as Role | undefined) ?? Role.kabupaten;
    const opdIdRaw = header('x-dev-opd-id');

    // `x-dev-roles` (5 September 2026, dipisah koma) menyatakan KEPEMILIKAN,
    // untuk menguji akun ber-role banyak. Tanpa header itu `roles` diisi
    // [actingRole] -- itulah yang membuat SELURUH e2e yang sudah ada tetap
    // berjalan tanpa satu pun perubahan.
    const rolesRaw = header('x-dev-roles');
    const diminta = rolesRaw
      ? rolesRaw
          .split(',')
          .map((r) => r.trim())
          .filter((r): r is Role => (Object.values(Role) as string[]).includes(r))
      : [];
    // actingRole SELALU termasuk yang dimiliki: di lingkungan stub, header
    // `x-dev-role` adalah pernyataan "saya sedang jadi ini", dan membiarkannya
    // di luar `roles` hanya akan menghasilkan keadaan mustahil yang tak pernah
    // dimaksudkan penulis ujinya.
    const roles = diminta.includes(actingRole) ? diminta : [...diminta, actingRole];

    const user: CurrentUser = {
      userId: Number(header('x-dev-user-id') ?? '1'),
      roles,
      actingRole,
      opdId: opdIdRaw ? Number(opdIdRaw) : null,
      ssoSubject: header('x-dev-sso-subject') ?? `stub-${actingRole}`,
    };

    return Promise.resolve(user);
  }

  /**
   * Di lingkungan stub tak pernah ada keadaan "belum memilih peran": header
   * `x-dev-role` selalu menghasilkan satu peran (dengan baku `kabupaten`).
   * Jadi jalur ini identik dengan `resolveUser`.
   */
  resolveUserWithoutActingRole(request: AuthRequestLike): Promise<CurrentUser | null> {
    return this.resolveUser(request);
  }
}
