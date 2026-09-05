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
import { hasFullAccess } from '../../../common/auth/role.util';
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

    // Kabupaten & Superuser melampaui seluruh pembatasan @Roles.
    //
    // Bypass ini SENGAJA tetap mencakup `kabupaten` walau `superuser` sudah
    // dipisah kembali (2026-08-20): banyak endpoint hanya ber-@Roles(opd) dan
    // area admin-kab mengandalkan bypass ini untuk mencapainya (buat/ubah/hapus
    // survei, builder pertanyaan). Karena itu pembatasan yang HARUS berlaku
    // walau bypass aktif ditegakkan di dalam service, bukan lewat @Roles --
    // lihat AuditService.assertSuperuser & DashboardService.getOpdDashboard.
    if (hasFullAccess(user.actingRole)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // `actingRole`, BUKAN `roles`: hak mengikuti peran yang sedang dipakai.
    if (!requiredRoles.includes(user.actingRole)) {
      throw new ForbiddenException('Anda tidak memiliki hak akses untuk sumber daya ini');
    }
    return true;
  }
}
