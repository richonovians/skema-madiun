import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../decorators/current-user.decorator';
import { assertOpdAccess, opdWhereFilter } from './opd-scope.util';

const user = (role: Role, opdId: number | null = null): CurrentUser => ({
  userId: 1,
  role,
  opdId,
  ssoSubject: `stub-${role}`,
});

describe('opdWhereFilter', () => {
  it('superuser → filter kosong (semua OPD)', () => {
    expect(opdWhereFilter(user(Role.superuser))).toEqual({});
  });

  it('kabupaten → filter kosong (semua OPD)', () => {
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
  it('superuser → boleh akses OPD mana pun', () => {
    expect(() => assertOpdAccess(user(Role.superuser), 99)).not.toThrow();
  });

  it('kabupaten → boleh akses OPD mana pun', () => {
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
});
