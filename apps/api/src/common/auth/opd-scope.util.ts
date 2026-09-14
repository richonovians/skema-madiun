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
  if (hasFullAccess(user.actingRole)) {
    return {};
  }
  if (user.actingRole === Role.opd) {
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
 *
 * `targetOpdId === null` berarti sumber dayanya BELUM BERTUJUAN — pengaduan
 * yang pengirimnya tak tahu harus ditujukan ke mana (6 September 2026). Hanya
 * peran berhak penuh yang boleh menyentuhnya; merekalah yang meneruskannya.
 *
 * Penolakan untuk null itu EKSPLISIT dan harus tetap begitu: tanpa cabang ini,
 * akun `opd` yang `opdId`-nya juga null lolos lewat `null === null` dan membaca
 * sumber daya yang bukan haknya.
 */
export function assertOpdAccess(user: CurrentUser, targetOpdId: number | null): void {
  if (hasFullAccess(user.actingRole)) {
    return;
  }
  if (targetOpdId == null) {
    throw new ForbiddenException(
      'Pengaduan ini belum diteruskan ke OPD mana pun, jadi belum menjadi tanggung jawab OPD',
    );
  }
  if (user.actingRole === Role.opd) {
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
