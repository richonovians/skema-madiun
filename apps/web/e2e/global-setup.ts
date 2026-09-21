import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { request } from '@playwright/test';

/**
 * Menerbitkan sesi SEKALI untuk seluruh jalannya uji (21 September 2026).
 *
 * Login dilakukan di sini, bukan di dalam fixture per-worker, karena setiap
 * `POST /auth/dev-login` menulis satu baris `audit_logs` ke basis data yang
 * dipakai tim. Fixture per-worker akan mengalikannya dengan jumlah worker --
 * pada sapuan audit 17 September, alat ukur yang login berulang meninggalkan 24
 * baris yang tak dapat dihapus lagi (penghapusan baris audit ditolak, dan
 * memang seharusnya begitu). Tiga login per jalannya uji sudah cukup.
 *
 * Inilah SATU-SATUNYA tulisan yang dilakukan suite ini. Seluruh permintaan
 * non-GET dari halaman diblokir di tingkat jaringan oleh fixture `responsif`.
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';

/**
 * Email atau ssoSubject akun yang dipakai mengukur. WAJIB diisi lewat env:
 * menuliskannya di sini akan memaksa setiap mesin memakai akun yang sama,
 * padahal isi basis data tiap orang berbeda.
 */
const IDENTITAS = process.env.E2E_IDENTIFIER ?? '';

export const BERKAS_TOKEN = resolve(__dirname, '.auth/token.json');

export default async function globalSetup(): Promise<void> {
  mkdirSync(resolve(__dirname, '.auth'), { recursive: true });

  if (!IDENTITAS) {
    // Berkas kosong, bukan galat: spec yang tak butuh sesi (mis. pengisian
    // survei anonim) harus tetap dapat berjalan tanpa E2E_IDENTIFIER, dan yang
    // butuh sesi akan melewati dirinya sendiri dengan pesan yang jelas.
    writeFileSync(BERKAS_TOKEN, '{}', 'utf8');
    return;
  }

  const api = await request.newContext({ baseURL: ORIGIN });
  const token: Record<string, string> = {};
  try {
    for (const peran of ['responden', 'opd', 'kabupaten'] as const) {
      const res = await api.post('/api/v1/auth/dev-login', {
        data: { identifier: IDENTITAS, role: peran },
      });
      if (!res.ok()) {
        // BERHENTI, bukan lanjut tanpa sesi. Terukur 21 September 2026: saat
        // dev-login dijawab 429 (batasnya 30 per menit, dan menjalankan suite
        // berulang cepat menyentuhnya), seluruh uji tetap "hijau" -- sebagian
        // melewati dirinya sendiri, sisanya mengukur halaman kosong yang memang
        // tak pernah meluber. Kegagalan yang berbunyi seperti keberhasilan jauh
        // lebih berbahaya daripada kegagalan yang berisik.
        throw new Error(
          `dev-login untuk peran ${peran} gagal (${res.status()}). ` +
            'Bila 429, tunggu satu menit lalu jalankan lagi; bila 401/403, ' +
            'periksa E2E_IDENTIFIER benar-benar memiliki peran tersebut.',
        );
      }
      token[peran] = (await res.json()).data.token;
    }
  } finally {
    await api.dispose();
  }

  writeFileSync(BERKAS_TOKEN, JSON.stringify(token), 'utf8');
  await panaskanRute(token.kabupaten, token.opd);
}

/**
 * Meminta tiap rute sekali supaya server dev sempat mengompilasinya.
 *
 * Bukan kerapian: server dev Next mengompilasi rute saat PERTAMA diminta, dan
 * uji yang mendarat lebih dulu mengukur halaman yang belum berisi. Terukur 21
 * September 2026, tepat sesudah menarik perubahan sidebar dari rekan setim:
 * tiga uji gagal pada jalan pertama -- dua di antaranya penjaga "halamannya
 * benar-benar berisi" -- lalu keduapuluhempatnya lulus pada jalan kedua tanpa
 * satu baris kode pun berubah. Kegagalan seperti itu menuduh perubahan orang
 * lain tanpa dasar, dan suite yang berbuat begitu akan berhenti dipercaya.
 *
 * Cookie disertakan supaya rutenya benar-benar dirender, bukan dijawab
 * pengalihan ke halaman masuk -- pengalihan tak memicu kompilasi halamannya.
 */
async function panaskanRute(tokenKab?: string, tokenOpd?: string): Promise<void> {
  const rute: Array<[string, string | undefined, string]> = [
    ['/admin-kab/dashboard', tokenKab, 'kabupaten'],
    ['/admin-kab/surveys', tokenKab, 'kabupaten'],
    ['/admin-kab/surveys/sampah', tokenKab, 'kabupaten'],
    ['/admin-kab/complaints', tokenKab, 'kabupaten'],
    ['/admin-opd/complaints', tokenOpd, 'opd'],
  ];

  const api = await request.newContext({ baseURL: ORIGIN });
  try {
    await Promise.all(
      rute.map(([path, token, peran]) =>
        token
          ? api
              .get(path, {
                headers: { Cookie: `token=${token}; role=${peran}; consent=1` },
                timeout: 60_000,
              })
              .catch(() => undefined)
          : Promise.resolve(undefined),
      ),
    );
  } finally {
    await api.dispose();
  }
}
