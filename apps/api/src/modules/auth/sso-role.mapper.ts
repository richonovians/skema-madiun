import { Role } from '@prisma/client';

/**
 * Peran yang BOLEH ditetapkan dari klaim SSO.
 *
 * `superuser` ADA di daftar ini sejak 6 September 2026, dan itu PEMBALIKAN
 * keputusan keamanan 27 Agustus 2026 yang sengaja mengeluarkannya — pengguna
 * meminta tipe "admin" dari Helpdesk menjadi superuser di SKEMA.
 *
 * Pembalikan itu tidak dibiarkan tanpa pengaman, tapi pengamannya BUKAN di
 * berkas ini:
 *   1. Baku tetap `responden` bila `HELPDESK_SSO_ROLE_MAP` kosong (dan hari ini
 *      ia memang kosong), jadi tak ada yang berubah sampai seseorang mengisinya.
 *   2. Peran ditetapkan HANYA saat akun dibuat — SsoService.resolveRolesAndOpd
 *      tak pernah berjalan pada akun yang sudah ada, sehingga tak ada jalan bagi
 *      klaim untuk menurunkan siapa pun.
 *   3. Akun yang lahir memegang `superuser` dari klaim menulis satu baris
 *      `audit_logs` — lihat SsoService.provision.
 */
const MAPPABLE_ROLES: readonly string[] = [Role.kabupaten, Role.opd, Role.responden];

/** Pemisah antar peran DI DALAM satu paket (`opd+responden`). */
const PACKAGE_SEPARATOR = '+';

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
 * `nilaiKlaim:paket` dipisah koma, dengan paket berisi satu peran atau beberapa
 * peran yang dipisah `+`:
 *
 *   `pegawai-dinas:opd+responden,admin:superuser+opd+responden`
 *
 * Bentuk LAMA (`admin-kab:kabupaten`) tetap sah dan menghasilkan paket berisi
 * satu peran — env yang sudah terpasang di lingkungan mana pun tak rusak oleh
 * penambahan format ini.
 *
 * Disimpan di env, bukan di kode, justru KARENA bentuk klaimnya belum
 * dikonfirmasi: begitu Helpdesk menjawab, yang berubah cuma satu baris env —
 * tak ada kode yang perlu disentuh, tak ada deploy ulang yang menunggu rilis.
 *
 * Entri cacat DIABAIKAN diam-diam alih-alih menggagalkan boot: env yang salah
 * tulis sebaiknya membuat pemetaan tak berlaku (semua akun baru jadi
 * `responden`, keadaan paling tidak berbahaya) daripada mematikan seluruh API.
 * Paket yang separuh cacat menyisakan peran yang sah saja.
 */
export function parseRolePackages(raw: string | undefined): Map<string, Role[]> {
  const map = new Map<string, Role[]>();
  if (!raw) {
    return map;
  }

  for (const entry of raw.split(',')) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = entry.slice(0, separator).trim().toLowerCase();
    if (!key) {
      continue;
    }

    const roles: Role[] = [];
    for (const part of entry.slice(separator + 1).split(PACKAGE_SEPARATOR)) {
      const roleName = part.trim().toLowerCase();
      if (!MAPPABLE_ROLES.includes(roleName)) {
        continue;
      }
      // Peran ganda di dalam satu paket dibuang di sini, bukan di pemanggil:
      // `users.roles` adalah array biasa, bukan himpunan, jadi duplikat akan
      // benar-benar tersimpan dan tampil dua kali di Manajemen User.
      if (!roles.includes(roleName as Role)) {
        roles.push(roleName as Role);
      }
    }
    if (roles.length === 0) {
      continue;
    }
    map.set(key, roles);
  }
  return map;
}

/**
 * Seluruh peran yang cocok dari daftar nilai klaim — GABUNGAN paketnya.
 *
 * Array kosong BUKAN galat — pemanggil yang menentukan peran bakunya
 * (`responden`).
 *
 * UNION, bukan peringkat. `ROLE_PRECEDENCE` dibuang bersama pemetaan tunggal:
 * begitu satu nilai klaim dapat membawa beberapa peran, "peran mana yang
 * menang" tak lagi bermakna. Union pun tak bergantung pada urutan klaim — yang
 * memang tak dijamin stabil oleh Helpdesk — karena himpunan hasilnya sama apa
 * pun urutan masukannya.
 */
export function resolveRolesFromClaims(values: string[], map: Map<string, Role[]>): Role[] {
  const matched: Role[] = [];
  for (const value of values) {
    for (const role of map.get(value) ?? []) {
      if (!matched.includes(role)) {
        matched.push(role);
      }
    }
  }
  return matched;
}
