import { Role } from '@prisma/client';

/**
 * Peran yang BOLEH ditetapkan dari klaim SSO. `superuser` sengaja TIDAK ada di
 * daftar ini, dan itu keputusan keamanan, bukan kelalaian: peran itu memegang
 * log aktivitas & manajemen pengguna (AuditService.assertSuperuser,
 * UsersService.assertSuperuser), sehingga membiarkannya dipetakan dari klaim
 * berarti menyerahkan penetapan hak tertinggi kepada sistem di luar kendali
 * kita. `superuser` hanya bisa diberikan Admin Kabupaten lewat Manajemen User.
 */
const MAPPABLE_ROLES: readonly string[] = [Role.kabupaten, Role.opd, Role.responden];

/**
 * Urutan kemenangan bila beberapa klaim cocok sekaligus. DITETAPKAN, bukan
 * "yang pertama ditemukan": urutan klaim dari Helpdesk tak dijamin stabil, dan
 * peran yang berubah-ubah antar login jauh lebih membingungkan daripada satu
 * aturan yang selalu sama. Batas atasnya `kabupaten` — lihat MAPPABLE_ROLES.
 */
const ROLE_PRECEDENCE: readonly Role[] = [Role.kabupaten, Role.opd, Role.responden];

/** Kunci objek yang mungkin memuat nama/kode grup, diperiksa berurutan. */
const OBJECT_KEYS = ['name', 'slug', 'id', 'code', 'kode'] as const;

/**
 * Ratakan klaim `groups` & `role` menjadi daftar nilai yang sudah dinormalkan
 * (huruf kecil, tanpa spasi tepi, tanpa duplikat).
 *
 * SENGAJA PEMAAF terhadap bentuk. Bentuk kedua klaim ini BELUM dikonfirmasi
 * Helpdesk (butir 04 dokumen permintaan), jadi fungsi ini menerima string
 * tunggal, string berisi daftar, array string, array objek, maupun objek
 * tunggal — dan mengembalikan array kosong (BUKAN melempar galat) untuk bentuk
 * yang tak dikenal. Alasannya konkret: galat di sini berarti login gagal total
 * hanya karena bentuk klaim di luar dugaan, padahal jalur aman selalu tersedia
 * yaitu jatuh ke peran baku `responden`.
 */
export function parseClaimValues(groups: unknown, role: unknown): string[] {
  const out: string[] = [];
  for (const source of [groups, role]) {
    for (const value of flatten(source)) {
      if (!out.includes(value)) {
        out.push(value);
      }
    }
  }
  return out;
}

function flatten(value: unknown): string[] {
  // String tingkat atas boleh berisi daftar ("a,b" atau "a b") — bentuk yang
  // lazim dipakai penyedia OAuth untuk klaim majemuk.
  if (typeof value === 'string') {
    return value
      .split(/[,\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    // Elemen array TIDAK dipecah lagi: sebuah nama grup adalah satu nilai utuh.
    return value.flatMap((item) => fromScalarOrObject(item));
  }
  return fromScalarOrObject(value);
}

function fromScalarOrObject(item: unknown): string[] {
  if (typeof item === 'string') {
    const normalized = item.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }
  // Angka/boolean POLOS diabaikan: sebagai nilai grup ia tak bermakna apa pun.
  // Berbeda dengan angka di dalam field `id` di bawah, yang jelas merujuk tenant.
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return [];
  }

  const record = item as Record<string, unknown>;
  for (const key of OBJECT_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return [value.trim().toLowerCase()];
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return [String(value)];
    }
  }
  return [];
}

/**
 * Baca tabel pemetaan dari env `HELPDESK_SSO_ROLE_MAP`, format
 * `nilaiKlaim:peran` dipisah koma (mis. `admin-kab:kabupaten,admin-opd:opd`).
 *
 * Disimpan di env, bukan di kode, justru KARENA bentuk klaimnya belum
 * dikonfirmasi: begitu Helpdesk menjawab, yang berubah cuma satu baris env —
 * tak ada kode yang perlu disentuh, tak ada deploy ulang yang menunggu rilis.
 *
 * Entri cacat DIABAIKAN diam-diam alih-alih menggagalkan boot: env yang salah
 * tulis sebaiknya membuat pemetaan tak berlaku (semua akun baru jadi
 * `responden`, keadaan paling tidak berbahaya) daripada mematikan seluruh API.
 */
export function parseRoleMap(raw: string | undefined): Map<string, Role> {
  const map = new Map<string, Role>();
  if (!raw) {
    return map;
  }

  for (const entry of raw.split(',')) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = entry.slice(0, separator).trim().toLowerCase();
    const roleName = entry
      .slice(separator + 1)
      .trim()
      .toLowerCase();
    if (!key || !MAPPABLE_ROLES.includes(roleName)) {
      continue;
    }
    map.set(key, roleName as Role);
  }
  return map;
}

/**
 * Peran yang cocok dari daftar nilai klaim, atau null bila tak ada.
 *
 * null BUKAN galat — pemanggil yang menentukan peran bakunya (`responden`).
 */
export function resolveRoleFromClaims(values: string[], map: Map<string, Role>): Role | null {
  const matched = new Set<Role>();
  for (const value of values) {
    const role = map.get(value);
    if (role) {
      matched.add(role);
    }
  }
  return ROLE_PRECEDENCE.find((role) => matched.has(role)) ?? null;
}
