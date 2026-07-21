import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../decorators/current-user.decorator';

/**
 * Menegakkan isolasi data per-OPD (PRD Bab 6): Admin OPD hanya data OPD-nya,
 * Admin Kabupaten semua OPD. Dipakai di service/controller, melengkapi `@Roles`.
 */

/**
 * Fragmen Prisma `where` untuk membatasi query ke OPD milik pengguna.
 * - `kabupaten` → `{}` (tanpa batas)
 * - `opd` → `{ opdId: user.opdId }`
 * - peran lain / akun OPD tanpa `opdId` → ForbiddenException (fail-safe)
 */
export function opdWhereFilter(user: CurrentUser): { opdId?: number } {
  if (user.role === Role.kabupaten) {
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
 * - `kabupaten` → selalu boleh
 * - `opd` → hanya bila `targetOpdId === user.opdId`
 * - peran lain / akun OPD tanpa `opdId` → ForbiddenException
 */
export function assertOpdAccess(user: CurrentUser, targetOpdId: number): void {
  if (user.role === Role.kabupaten) {
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
