import { expect, test } from '@playwright/test';
import { AKUN, masukApi, panggilApi } from './support/api.js';

/**
 * Pagar regresi BUG-014 & BUG-018 — dua cacat siklus hidup notifikasi.
 *
 * Keduanya berakar pada satu keputusan rancangan: **notifikasi menaut induknya
 * lewat TEKS pada kolom `link`, bukan kunci asing.** Karena itu ia tak pernah
 * ikut `ON DELETE CASCADE`, dan tak ada satu pun batasan basis data yang
 * mencegahnya diterbitkan dua kali. Pembersihan 15 September 2026 menemukan
 * **7.986** notifikasi tanpa induk di lingkungan dev — sebelas hari tanpa penyapu.
 *
 * ── Kenapa tanpa peramban ───────────────────────────────────────────────────
 * Yang salah bukan tampilannya melainkan barisnya. Melewati antarmuka hanya
 * menambah halaman yang bisa gagal karena sebab lain. Ia tetap di suite E2E,
 * bukan Jest, karena hanya tumpukan sungguhan yang dapat membuktikannya — di
 * Jest, MSW menjawab apa pun yang fixture-nya katakan.
 *
 * ── Kenapa tiap cacat punya uji kendali yang WAJIB lulus ────────────────────
 * `test.fail()` menelan kegagalan apa pun, termasuk backend yang mati. Tanpa
 * kendali, berkas ini hijau di lingkungan yang tak menyala sama sekali. Uji
 * kendali membuktikan notifikasinya memang terbit lebih dulu, sehingga
 * ketiadaannya (atau penggandaannya) sesudah itu benar-benar berarti.
 *
 * ── Data uji ────────────────────────────────────────────────────────────────
 * Seluruh baris berjudul `[UJI ` supaya terjaring
 * `e2e/support/bersihkan-data-uji.mjs`. Survei BUG-014 dimusnahkan oleh ujinya
 * sendiri — itu memang langkahnya — dan notifikasi tanpa induk yang ditinggalkannya
 * hanya tersapu oleh bendera `--tanpa-induk`. Pengaduan tak punya endpoint hapus sama
 * sekali, jadi ia ditinggalkan untuk skrip pembersih.
 */

const PENANDA = Date.now();

/** Notifikasi milik akun yang sedang masuk, terbaru dulu. */
async function notifikasiSaya(token) {
  return (await panggilApi(token, 'GET', '/notifications?limit=100&sort=desc')) ?? [];
}

test.describe('BUG-014 — hapus permanen meninggalkan notifikasi tanpa induk', () => {
  // Serial DI DALAM describe, bukan di tingkat berkas: uji kedua bergantung
  // pada survei yang dibuat uji pertama, tetapi pagar BUG-018 di bawah tidak.
  // Dipasang di tingkat berkas, kegagalan satu pagar (yaitu justru saat
  // cacatnya diperbaiki) membuat pagar yang lain TAK DIJALANKAN sama sekali —
  // terbaca di laporan sebagai "did not run", bukan sebagai hijau atau merah.
  test.describe.configure({ mode: 'serial' });

  let tokenOpd;
  let tokenKabupaten;
  let surveiId = null;

  /** Notifikasi yang menaut survei uji ini. `(?![0-9])` mencegah id 305 tercocok oleh 3051. */
  const menautSurvei = (rows) =>
    rows.filter((n) => new RegExp(`/surveys/${surveiId}(?![0-9])`).test(n.link ?? ''));

  test.beforeAll(async () => {
    tokenOpd = (await masukApi(AKUN.adminOpd, 'opd')).token;
    tokenKabupaten = (await masukApi(AKUN.adminKabupaten, 'kabupaten')).token;
  });

  test.afterAll(async () => {
    if (!surveiId) return;
    // Jaring pengaman bila uji pertama berhenti sebelum memusnahkannya sendiri.
    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}`).catch(() => {});
    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}/purge`).catch(() => {});
  });

  test('kendali — survei yang dijawab menerbitkan notifikasi yang menautnya', async () => {
    const survei = await panggilApi(tokenOpd, 'POST', '/surveys', {
      judul: `[UJI BUG-014] Survei pengunci notifikasi tanpa induk ${PENANDA}`,
      periode: '2027-Q3',
    });
    surveiId = survei.id;

    await panggilApi(tokenOpd, 'POST', `/surveys/${surveiId}/questions`, {
      teks: 'Bagaimana kualitas layanan yang Anda terima?',
      tipe: 'skala',
      isIkmUnsur: true,
      kodeUnsur: 'U1',
    });
    await panggilApi(tokenOpd, 'PATCH', `/surveys/${surveiId}/status`, { status: 'aktif' });

    const tokenWarga = (await masukApi(AKUN.warga, 'responden')).token;
    const isian = await panggilApi(tokenWarga, 'GET', `/surveys/${surveiId}/fill`);
    await panggilApi(tokenWarga, 'POST', `/surveys/${surveiId}/responses`, {
      answers: [{ questionId: isian.questions[0].id, nilai: 3 }],
      tanpaDataDiri: true,
    });

    // Alat ukurnya. Kalau notifikasinya tak pernah terbit, uji berikutnya hijau
    // tanpa membuktikan apa pun.
    expect(
      menautSurvei(await notifikasiSaya(tokenKabupaten)).length,
      'tak ada notifikasi yang menaut survei uji — alat ukur pagar ini tidak bekerja',
    ).toBeGreaterThan(0);
  });

  test('sesudah dimusnahkan permanen, tak ada notifikasi yang masih menautnya', async () => {
    test.fail(
      true,
      'BUG-014 masih terbuka: `SurveysService.purge` menghapus enam tabel secara ' +
        'tersurat dan `notifications` tidak termasuk — ia menaut induknya lewat teks ' +
        '`link`, bukan kunci asing, jadi tak pernah ikut cascade. Cabut anotasi ini ' +
        'begitu penyapunya dipasang.',
    );

    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}`);
    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}/purge`);

    const tersisa = menautSurvei(await notifikasiSaya(tokenKabupaten));
    expect(
      tersisa.map((n) => n.link),
      'notifikasi masih menunjuk survei yang sudah tiada — menekannya mendarat pada "Survei tidak ditemukan"',
    ).toEqual([]);
  });
});

test.describe('BUG-018 — meneruskan pengaduan menyiarkan ulang "Pengaduan Baru Masuk"', () => {
  test.describe.configure({ mode: 'serial' });

  let tokenKabupaten;
  let tiket = null;
  let pengaduanId = null;
  let opdTujuan = null;

  /** Notifikasi "pengaduan baru" untuk tiket ini, pada akun yang sedang masuk. */
  const kabarBaru = (rows) =>
    rows.filter((n) => n.type === 'complaint_created' && (n.message ?? '').includes(tiket));

  test.beforeAll(async () => {
    tokenKabupaten = (await masukApi(AKUN.adminKabupaten, 'kabupaten')).token;
  });

  test('kendali — pengaduan tanpa OPD terbit sekali kepada Admin Kabupaten', async () => {
    const daftarOpd = await panggilApi(tokenKabupaten, 'GET', '/opd?limit=5');
    opdTujuan = (daftarOpd ?? [])[0]?.id;
    expect(opdTujuan, 'tak ada OPD yang dapat dijadikan tujuan').toBeTruthy();

    const tokenWarga = (await masukApi(AKUN.warga, 'responden')).token;
    const pengaduan = await panggilApi(tokenWarga, 'POST', '/complaints', {
      judul: `[UJI BUG-018] Pengaduan pengunci notifikasi ${PENANDA}`,
      uraian:
        'Dibuat otomatis oleh pagar regresi BUG-018. Sengaja TANPA memilih OPD, ' +
        'supaya dapat diteruskan Admin Kabupaten pada langkah berikutnya.',
      kategori: 'aduan',
    });
    tiket = pengaduan.ticketNo;
    pengaduanId = pengaduan.id;

    // Satu kabar untuk satu pengaduan baru. Angka inilah pembandingnya — tanpa
    // dia, "dua" sesudah diteruskan tak berarti apa-apa.
    expect(
      kabarBaru(await notifikasiSaya(tokenKabupaten)).length,
      'pengaduan baru tak menerbitkan kabar apa pun — alat ukur pagar ini tidak bekerja',
    ).toBe(1);
  });

  test('meneruskan ke OPD tidak menyiarkan ulang kabar itu kepada yang sudah menerimanya', async () => {
    test.fail(
      true,
      'BUG-018 masih terbuka: penugasan OPD menempuh jalur penyiaran yang sama ' +
        'dengan pengaduan baru, sehingga admin yang sudah diberi tahu diberi tahu ' +
        'lagi — dan kalimatnya pun keliru, sebab yang terjadi bukan pengaduan baru ' +
        'masuk. Cabut anotasi ini begitu penyiarannya dipersempit ke OPD tujuan.',
    );

    await panggilApi(tokenKabupaten, 'PATCH', `/complaints/${pengaduanId}/opd`, {
      opdId: opdTujuan,
    });

    expect(
      kabarBaru(await notifikasiSaya(tokenKabupaten)).length,
      'Admin Kabupaten menerima "Pengaduan Baru Masuk" untuk kedua kalinya atas pengaduan yang sama',
    ).toBe(1);
  });
});
