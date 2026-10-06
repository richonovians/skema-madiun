import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

/**
 * Kunci metadata milik `@nestjs/throttler` 6.5.0, dibaca dari sumbernya
 * (`throttler.constants.js`): nama throttler disambung ke kunci, dan proyek ini
 * hanya memakai throttler bernama `default`.
 */
const KUNCI_LIMIT = 'THROTTLER:LIMITdefault';
const KUNCI_TTL = 'THROTTLER:TTLdefault';

type BatasLaju = { limit: number; ttlMs: number };

type Anotasi = {
  peran: Role[];
  publik: boolean;
  batasLaju: BatasLaju | null;
};

/** Metadata handler lebih dulu, lalu jatuh ke metadata kelasnya. */
function metadata<T>(kunci: string, handler: unknown, kelas: unknown): T | undefined {
  return (
    (Reflect.getMetadata(kunci, handler as object) as T | undefined) ??
    (Reflect.getMetadata(kunci, kelas as object) as T | undefined)
  );
}

function batasDari(handler: unknown, kelas: unknown): BatasLaju | null {
  const limit = metadata<number>(KUNCI_LIMIT, handler, kelas);
  const ttlMs = metadata<number>(KUNCI_TTL, handler, kelas);
  if (typeof limit !== 'number' || typeof ttlMs !== 'number') return null;
  return { limit, ttlMs };
}

/**
 * Menyisipkan peran, status publik, dan batas laju ke tiap operasi dokumen
 * OpenAPI sebagai ekstensi `x-`.
 *
 * MENGAPA LEWAT `operationId`. Dokumen tak menyimpan rujukan ke handler yang
 * melahirkannya, tetapi `operationId` berpola `NamaController_namaMethod` dan
 * terukur ADA pada 65 dari 65 operasi serta unik (6 Oktober 2026). Itu cukup
 * untuk memetakan balik tanpa menyentuh satu pun controller -- sehingga
 * anotasinya tak dapat usang: ia membaca metadata yang ditegakkan `RolesGuard`
 * dan `ThrottlerGuard` yang sesungguhnya, bukan naskah yang ditulis tangan di
 * 65 tempat.
 *
 * `x-` adalah ekstensi sah OpenAPI 3; Swagger UI melewatinya tanpa keluhan.
 *
 * Daftar peran KOSONG bukan berarti data hilang. Beberapa endpoint memang tak
 * memasang `@Roles` dan menegakkan isolasinya di service (mis.
 * `GET /complaints`, `GET /opd`); bagi mereka yang benar adalah "seluruh peran
 * terautentikasi", dan daftar kosong menyatakan itu tanpa mengarang nama peran.
 */
export function anotasiRute(app: INestApplication, dokumen: OpenAPIObject): OpenAPIObject {
  const discovery = app.get(DiscoveryService, { strict: false });
  const peta = new Map<string, Anotasi>();

  for (const pembungkus of discovery.getControllers()) {
    const kelas = pembungkus.metatype;
    if (!kelas?.prototype) continue;

    for (const nama of Object.getOwnPropertyNames(kelas.prototype)) {
      if (nama === 'constructor') continue;

      const handler = (kelas.prototype as Record<string, unknown>)[nama];
      if (typeof handler !== 'function') continue;

      peta.set(`${kelas.name}_${nama}`, {
        peran: metadata<Role[]>(ROLES_KEY, handler, kelas) ?? [],
        publik: metadata<boolean>(IS_PUBLIC_KEY, handler, kelas) === true,
        batasLaju: batasDari(handler, kelas),
      });
    }
  }

  // Throttle GLOBAL berlaku bagi SEMUA endpoint, jadi 429 dapat terjadi di mana
  // saja. Angkanya dibaca dari konfigurasi yang sama dengan yang dipakai
  // `ThrottlerModule.forRootAsync`, bukan disalin sebagai angka tetap: salinan
  // akan berbohong begitu konfigurasinya diubah.
  const config = app.get(ConfigService, { strict: false });
  (dokumen as unknown as Record<string, unknown>)['x-batas-laju-global'] = {
    limit: config.get<number>('throttle.limit') ?? 100,
    ttlMs: config.get<number>('throttle.ttlMs') ?? 60_000,
  };

  for (const butir of Object.values(dokumen.paths ?? {})) {
    for (const operasi of Object.values(butir as Record<string, { operationId?: string }>)) {
      const anotasi = operasi?.operationId ? peta.get(operasi.operationId) : undefined;
      if (!anotasi) continue;

      const target = operasi as Record<string, unknown>;
      target['x-publik'] = anotasi.publik;
      // Endpoint publik tak punya peran, dan menuliskan `x-peran: []` untuknya
      // akan terbaca sebagai "butuh sesi, peran apa pun" -- justru kebalikannya.
      if (!anotasi.publik) target['x-peran'] = anotasi.peran;
      target['x-batas-laju'] = anotasi.batasLaju;
    }
  }

  return dokumen;
}
