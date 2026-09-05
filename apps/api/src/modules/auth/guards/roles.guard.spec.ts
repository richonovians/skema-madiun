import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ALLOW_UNSELECTED_ROLE_KEY } from '../../../common/decorators/allow-unselected-role.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { AuthProvider } from '../interfaces/auth-provider.interface';
import { RolesGuard } from './roles.guard';

/**
 * Guard ini adalah tempat keputusan "HAK IKUT TURUN sesuai peran yang dipakai"
 * (5 September 2026) benar-benar ditegakkan. Sebelum ini ia tak punya uji sama
 * sekali.
 *
 * Metadata dimock BERDASARKAN KUNCI, bukan lewat rantai `mockReturnValueOnce`:
 * rantai itu bergantung pada urutan pemanggilan di dalam guard, sehingga
 * menukar urutan pembacaan metadata akan mengubah arti seluruh uji di sini
 * tanpa satu pun yang memerah.
 */
type Metadata = {
  [IS_PUBLIC_KEY]?: boolean;
  [ALLOW_UNSELECTED_ROLE_KEY]?: boolean;
  [ROLES_KEY]?: Role[];
};

function buat(metadata: Metadata, provider: Partial<AuthProvider>) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => (metadata as Record<string, unknown>)[key]),
  } as unknown as Reflector;

  const request: { user?: CurrentUser } = {};
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;

  const guard = new RolesGuard(reflector, provider as AuthProvider);
  return { guard, context, request };
}

const pengguna = (over: Partial<CurrentUser> = {}): CurrentUser => ({
  userId: 9,
  roles: [Role.opd],
  actingRole: Role.opd,
  opdId: 1,
  ...over,
});

describe('RolesGuard', () => {
  it('rute @Public dilewati tanpa menyentuh AuthProvider', async () => {
    const resolveUser = jest.fn();
    const { guard, context } = buat({ [IS_PUBLIC_KEY]: true }, { resolveUser });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it('tanpa pengguna -> 401', async () => {
    const { guard, context } = buat(
      { [ROLES_KEY]: [Role.opd] },
      { resolveUser: jest.fn().mockResolvedValue(null) },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  /**
   * INTI SELURUH FITUR MULTI-ROLE. Akun ini MEMILIKI `superuser`, tapi sedang
   * bertindak sebagai `opd`. Rute yang menuntut `kabupaten` harus MENOLAK.
   *
   * Kalau uji ini lulus padahal seharusnya menolak, berarti hak dihitung dari
   * `roles` (gabungan) dan keputusan pengguna "hak ikut turun" tidak terwujud.
   */
  it('MENOLAK bila actingRole tak memenuhi @Roles, walau roles memuat yang cukup', async () => {
    const { guard, context } = buat(
      { [ROLES_KEY]: [Role.kabupaten] },
      {
        resolveUser: jest
          .fn()
          .mockResolvedValue(pengguna({ roles: [Role.superuser, Role.opd], actingRole: Role.opd })),
      },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  /**
   * PASANGAN yang membuat uji di atas berarti: akun yang SAMA, hanya peran yang
   * dipakainya berbeda. Tanpa ini, "menolak" di atas bisa saja karena guard
   * menolak semuanya.
   */
  it('KONTROL: akun yang SAMA dengan actingRole superuser diloloskan', async () => {
    const { guard, context } = buat(
      { [ROLES_KEY]: [Role.kabupaten] },
      {
        resolveUser: jest
          .fn()
          .mockResolvedValue(
            pengguna({ roles: [Role.superuser, Role.opd], actingRole: Role.superuser }),
          ),
      },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('actingRole yang memenuhi @Roles diloloskan', async () => {
    const { guard, context } = buat(
      { [ROLES_KEY]: [Role.opd] },
      { resolveUser: jest.fn().mockResolvedValue(pengguna()) },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('tanpa @Roles, pengguna mana pun diloloskan', async () => {
    const { guard, context } = buat(
      {},
      { resolveUser: jest.fn().mockResolvedValue(pengguna({ actingRole: Role.responden })) },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('menempelkan pengguna ke request supaya @CurrentUser dapat membacanya', async () => {
    const orang = pengguna();
    const { guard, context, request } = buat(
      { [ROLES_KEY]: [Role.opd] },
      { resolveUser: jest.fn().mockResolvedValue(orang) },
    );

    await guard.canActivate(context);

    expect(request.user).toBe(orang);
  });

  describe('@AllowUnselectedRole', () => {
    it('meneruskan walau peran belum terpilih (401 dari resolveUser ditangkap)', async () => {
      const orang = pengguna({ roles: [Role.superuser, Role.opd] });
      const { guard, context, request } = buat(
        { [ALLOW_UNSELECTED_ROLE_KEY]: true },
        {
          resolveUser: jest.fn().mockRejectedValue(new UnauthorizedException()),
          resolveUserWithoutActingRole: jest.fn().mockResolvedValue(orang),
        },
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toBe(orang);
    });

    /**
     * KONTROL: kekecualian itu HANYA untuk rute berdekorator. Tanpa uji ini,
     * menangkap UnauthorizedException tanpa syarat akan membuat SETIAP rute
     * dapat diakses tanpa memilih peran -- meniadakan seluruh fitur.
     */
    it('KONTROL: tanpa dekorator, 401 belum-memilih tetap diteruskan ke pemanggil', async () => {
      const resolveUserWithoutActingRole = jest.fn();
      const { guard, context } = buat(
        { [ROLES_KEY]: [Role.opd] },
        {
          resolveUser: jest.fn().mockRejectedValue(new UnauthorizedException()),
          resolveUserWithoutActingRole,
        },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(resolveUserWithoutActingRole).not.toHaveBeenCalled();
    });

    it('sesi tak sah pada rute berdekorator tetap 401', async () => {
      const { guard, context } = buat(
        { [ALLOW_UNSELECTED_ROLE_KEY]: true },
        {
          resolveUser: jest.fn().mockRejectedValue(new UnauthorizedException()),
          resolveUserWithoutActingRole: jest.fn().mockResolvedValue(null),
        },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
