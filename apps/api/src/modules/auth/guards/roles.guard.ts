import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ALLOW_UNSELECTED_ROLE_KEY } from '../../../common/decorators/allow-unselected-role.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AUTH_PROVIDER } from '../auth.constants';
import { AuthProvider, AuthRequestLike } from '../interfaces/auth-provider.interface';

/**
 * Guard global: (1) melewati route @Public, (2) me-resolve CurrentUser via AuthProvider
 * dan menempelkannya ke request, (3) menegakkan @Roles bila ada.
 * Saat SSO aktif, hanya implementasi AuthProvider yang berganti — guard ini tetap.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequestLike & { user?: CurrentUser }>();

    // Rute pemilih peran (5 September 2026). Lihat AllowUnselectedRole untuk
    // alasannya: tanpa kekecualian ini akun ber-role banyak terkurung, karena
    // rute yang dipakai untuk MEMILIH peran pun menolaknya 401.
    const bolehTanpaPilihan = this.reflector.getAllAndOverride<boolean>(ALLOW_UNSELECTED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    let user: CurrentUser | null;
    try {
      user = await this.authProvider.resolveUser(request);
    } catch (err) {
      // `resolveUser` melempar 401 ketika sesinya SAH tapi perannya belum
      // terpilih (SessionAuthProvider). Untuk rute berdekorator, teruskan
      // dengan identitas tanpa peran terpilih; untuk rute lain, lemparkan apa
      // adanya -- kalau tidak, SETIAP rute jadi dapat diakses tanpa memilih
      // peran dan seluruh fitur ini kehilangan artinya.
      if (!bolehTanpaPilihan || !(err instanceof UnauthorizedException)) {
        throw err;
      }
      user = await this.authProvider.resolveUserWithoutActingRole(request);
    }
    if (!user) {
      throw new UnauthorizedException('Autentikasi diperlukan');
    }
    request.user = user;

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      // Rute tanpa `@Roles` tetap terbuka bagi pengguna terautentikasi mana pun
      // (33 dari 62 rute). Yang dibongkar T6 adalah jalan pintas ATAS dekorator,
      // bukan aturan rute yang memang tak berdekorator.
      return true;
    }

    // `@Roles` DITEGAKKAN APA ADANYA (temuan audit T6, 7 September 2026).
    //
    // Sampai 6 September 2026, `kabupaten` & `superuser` melampaui seluruh
    // `@Roles` tanpa syarat. Akibatnya dekoratornya BERBOHONG: rute
    // ber-`@Roles(Role.kabupaten)` di audit.controller.ts juga terbuka bagi
    // kabupaten, dan setiap rute ber-`@Roles(Role.opd)` terbuka bagi keduanya.
    // Yang menahan hanya pemeriksaan di dalam service -- sehingga rute BARU yang
    // lupa memeriksanya diam-diam terbuka bagi dua peran terkuat. Itu fail-OPEN,
    // dan kegagalan sunyi adalah yang paling mahal.
    //
    // Peran berakses penuh yang memang perlu masuk sekarang DITULIS di daftar
    // rutenya masing-masing (seluruh 29 dekorator sudah disisir). Kegagalannya
    // kini fail-CLOSED: daftar yang kurang menjawab 403 dan langsung terlihat.
    //
    // `actingRole`, BUKAN `roles`: hak mengikuti peran yang sedang dipakai.
    if (!requiredRoles.includes(user.actingRole)) {
      // Pesannya MENYEBUT peran yang dibutuhkan. Pesan lama ("Anda tidak
      // memiliki hak akses...") tak dapat dibedakan dari penolakan di dalam
      // service, sehingga sebuah uji dapat lulus karena gerbang yang salah --
      // itu benar-benar terjadi pada e2e users & audit.
      throw new ForbiddenException(
        `Sumber daya ini hanya untuk peran: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
