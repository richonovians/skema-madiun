import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLE_SELECTION_REQUIRED, resolveActingRole } from '../acting-role.util';
import { AuthProvider, AuthRequestLike } from '../interfaces/auth-provider.interface';
import { SessionCookieService } from '../session/session-cookie.service';
import { SessionService } from '../session/session.service';
import type { SessionPayload } from '../session/session.service';

/**
 * AuthProvider berbasis sesi lokal (JWT) — token diterbitkan SessionService
 * (lihat di sana untuk alasan payload minimal). Menggantikan StubAuthProvider
 * setelah endpoint penerbit token tersedia: `dev-login` (header Bearer) dan
 * callback SSO Helpdesk (cookie `session` HttpOnly, 2026-08-27). Kedua jalur
 * berdampingan — lihat `extractToken()` di bawah untuk alasannya.
 *
 * Setiap request memvalidasi ULANG status akun ke DB (isActive, soft-delete) —
 * bukan sekadar signature token — agar penonaktifan akun berlaku seketika, bukan
 * menunggu token lama kedaluwarsa. Sejak multi-role (5 September 2026),
 * KEPEMILIKAN role juga dibaca ulang di sini, sehingga pencabutan role pun
 * berlaku pada permintaan berikutnya.
 */
@Injectable()
export class SessionAuthProvider implements AuthProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  async resolveUser(request: AuthRequestLike): Promise<CurrentUser | null> {
    const sesi = await this.bacaSesi(request);
    if (!sesi) {
      return null;
    }
    const { user, payload } = sesi;

    const hasil = resolveActingRole({
      roles: user.roles,
      act: payload.act,
      opdId: user.opdId,
    });
    if (!hasil.ok) {
      // 401 (bukan 403) DENGAN kode khas. Bagi frontend ini bukan "sesi mati"
      // melainkan "peran belum dipilih", dan interceptor api.js membedakan
      // keduanya lewat kode ini -- tanpa itu ia akan membuang sesi yang
      // sebenarnya masih sah dan memaksa login ulang tanpa sebab.
      //
      // Dilempar, bukan dikembalikan `null`: `null` berarti "tak ada pengguna"
      // dan menghasilkan pesan 401 generik yang menyesatkan.
      throw new UnauthorizedException({
        message: 'Peran yang ingin dipakai belum dipilih',
        code: ROLE_SELECTION_REQUIRED,
        reason: hasil.reason,
      });
    }

    return this.bentuk(user, hasil.actingRole);
  }

  /**
   * Lihat alasannya di `AuthProvider.resolveUserWithoutActingRole`. Sengaja
   * memakai `bacaSesi()` yang SAMA dengan `resolveUser` di atas: kalau
   * pemeriksaan akun aktif/soft-delete disalin ke dua tempat, salah satunya
   * cepat atau lambat akan tertinggal saat aturannya berubah.
   */
  async resolveUserWithoutActingRole(request: AuthRequestLike): Promise<CurrentUser | null> {
    const sesi = await this.bacaSesi(request);
    if (!sesi) {
      return null;
    }
    // `roles[0]` PENAMPUNG belaka. Rute yang memakai jalur ini tak ber-@Roles
    // dan tak memakai `actingRole` untuk apa pun.
    return this.bentuk(sesi.user, sesi.user.roles[0]);
  }

  /** Token -> payload -> baris user yang masih aktif. Satu-satunya tempat. */
  private async bacaSesi(
    request: AuthRequestLike,
  ): Promise<{ user: User; payload: SessionPayload } | null> {
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
    // Akun tanpa role sama sekali tak dapat berbuat apa pun. Keadaan ini
    // seharusnya mustahil (UsersService menuntut minimal satu role), tapi bila
    // terjadi lebih baik dijawab "tak ada sesi" daripada meledak di
    // `roles[0]` yang undefined.
    if (user.roles.length === 0) {
      return null;
    }

    return { user, payload };
  }

  private bentuk(user: User, actingRole: (typeof user.roles)[number]): CurrentUser {
    return {
      userId: user.id,
      roles: user.roles,
      actingRole,
      opdId: user.opdId,
      ssoSubject: user.ssoSubject,
    };
  }

  /**
   * Id pemilik sesi dari tanda tangan tokennya saja -- TANPA kueri basis data
   * (14 September 2026). Lihat alasannya di `AuthProvider.identitasRingan`.
   *
   * Memakai `extractToken` dan `sessionService.verify` YANG SAMA dengan
   * `bacaSesi`, sehingga tak ada jalur kedua yang bisa diam-diam berbeda. Yang
   * TIDAK diperiksa di sini: akun aktif, soft-delete, kepemilikan peran. Untuk
   * kunci penghitung hal itu tak diperlukan -- token bertanda tangan sah dari
   * akun yang baru dinonaktifkan tetap layak dihitung sebagai satu pengirim,
   * dan permintaannya toh ditolak RolesGuard beberapa milidetik kemudian.
   */
  identitasRingan(request: AuthRequestLike): number | null {
    const token = this.extractToken(request);
    if (!token) {
      return null;
    }
    return this.sessionService.verify(token)?.sub ?? null;
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
