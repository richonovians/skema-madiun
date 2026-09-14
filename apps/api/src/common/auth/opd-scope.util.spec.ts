import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../decorators/current-user.decorator';
import { assertOpdAccess, opdWhereFilter } from './opd-scope.util';

const user = (actingRole: Role, opdId: number | null = null): CurrentUser => ({
  userId: 1,
  roles: [actingRole],
  actingRole,
  opdId,
  ssoSubject: `stub-${actingRole}`,
});

describe('opdWhereFilter', () => {
  it('kabupaten (= superuser) → filter kosong (semua OPD)', () => {
    expect(opdWhereFilter(user(Role.kabupaten))).toEqual({});
  });

  it('opd → dibatasi ke opdId miliknya', () => {
    expect(opdWhereFilter(user(Role.opd, 7))).toEqual({ opdId: 7 });
  });

  it('opd tanpa opdId → Forbidden (fail-safe)', () => {
    expect(() => opdWhereFilter(user(Role.opd, null))).toThrow(ForbiddenException);
  });

  it('responden → Forbidden', () => {
    expect(() => opdWhereFilter(user(Role.responden))).toThrow(ForbiddenException);
  });
});

describe('assertOpdAccess', () => {
  it('kabupaten (= superuser) → boleh akses OPD mana pun', () => {
    expect(() => assertOpdAccess(user(Role.kabupaten), 99)).not.toThrow();
  });

  it('opd → boleh akses OPD sendiri', () => {
    expect(() => assertOpdAccess(user(Role.opd, 5), 5)).not.toThrow();
  });

  it('opd → dilarang akses OPD lain', () => {
    expect(() => assertOpdAccess(user(Role.opd, 5), 6)).toThrow(ForbiddenException);
  });

  it('opd tanpa opdId → Forbidden', () => {
    expect(() => assertOpdAccess(user(Role.opd, null), 5)).toThrow(ForbiddenException);
  });

  it('responden → Forbidden', () => {
    expect(() => assertOpdAccess(user(Role.responden), 5)).toThrow(ForbiddenException);
  });

  /**
   * Sumber daya TANPA OPD tujuan — pengaduan "belum bertujuan" (6 September
   * 2026). Hanya peran berhak penuh yang boleh menyentuhnya, karena hanya
   * merekalah yang bertugas meneruskannya.
   */
  describe('target OPD null (belum bertujuan)', () => {
    it('kabupaten & superuser → boleh', () => {
      expect(() => assertOpdAccess(user(Role.kabupaten), null)).not.toThrow();
      expect(() => assertOpdAccess(user(Role.superuser), null)).not.toThrow();
    });

    /**
     * INI PEMERIKSAAN KEAMANAN, bukan kerapian tipe. Tanpa penolakan eksplisit,
     * akun `opd` yang `opdId`-nya juga null akan lolos lewat perbandingan
     * `null === null` dan membaca pengaduan yang bukan haknya sama sekali.
     */
    it('opd → DITOLAK, termasuk akun yang opdId-nya juga null', () => {
      expect(() => assertOpdAccess(user(Role.opd, 5), null)).toThrow(ForbiddenException);
      expect(() => assertOpdAccess(user(Role.opd, null), null)).toThrow(ForbiddenException);
    });

    it('responden → DITOLAK', () => {
      expect(() => assertOpdAccess(user(Role.responden), null)).toThrow(ForbiddenException);
    });
  });
});
