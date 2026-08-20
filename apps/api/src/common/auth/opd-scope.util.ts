import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../decorators/current-user.decorator';
import { hasFullAccess } from './role.util';

/**
 * Menegakkan isolasi data per-OPD (PRD Bab 6): Admin OPD hanya data OPD-nya,
 * Admin Kabupaten semua OPD. Dipakai di service/controller, melengkapi `@Roles`.
 */

/**
 * Fragmen Prisma `where` untuk membatasi query ke OPD milik pengguna.
 * - `kabupaten` (= superuser, 2026-08-05) → `{}` (tanpa batas)
 * - `opd` → `{ opdId: user.opdId }`
 * - peran lain / akun OPD tanpa `opdId` → ForbiddenException (fail-safe)
 */
export function opdWhereFilter(user: CurrentUser): { opdId?: number } {
  if (hasFullAccess(user.role)) {
    return {};
  }
  if (user.role === Role.opd) {
    if (user.opdId == null) {
      throw new ForbiddenException('Akun OPD tidak tertaut ke OPD mana pun');
    }
    return { opdId: user.opdId };
  }
  throw new ForbiddenException('Peran tidak memiliki akses ke sumber daya OPD');
}

/**
 * Memastikan pengguna boleh mengakses resource milik OPD tertentu (akses by-id).
 * - `kabupaten` (= superuser, 2026-08-05) → selalu boleh
 * - `opd` → hanya bila `targetOpdId === user.opdId`
 * - peran lain / akun OPD tanpa `opdId` → ForbiddenException
 */
export function assertOpdAccess(user: CurrentUser, targetOpdId: number): void {
  if (hasFullAccess(user.role)) {
    return;
  }
  if (user.role === Role.opd) {
    if (user.opdId == null) {
      throw new ForbiddenException('Akun OPD tidak tertaut ke OPD mana pun');
    }
    if (user.opdId !== targetOpdId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke data OPD ini');
    }
    return;
  }
  throw new ForbiddenException('Peran tidak memiliki akses ke sumber daya OPD');
}
