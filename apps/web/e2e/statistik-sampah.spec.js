import { expect, test } from '@playwright/test';
import { AKUN, masukApi, panggilApi } from './support/api.js';

/**
 * Pengunci BUG-013 — survei yang sudah dibuang ke Sampah tetap ikut menghitung
 * angka yang dipampang kepada publik di `GET /statistics`.
 *
 * ── Kenapa berkas ini tak membuka peramban sama sekali ───────────────────────
 * Yang tercemar bukan tampilan melainkan ANGKANYA. Melewati antarmuka hanya
 * menambah tiga halaman yang bisa gagal karena sebab lain, dan membuat
 * kegagalan uji ini tak lagi menunjuk satu tempat. Ia tetap tinggal di suite
 * E2E, bukan Jest, karena satu-satunya cara membuktikannya adalah menghadapkan
 * tumpukan yang sungguhan — di Jest, MSW yang menjawab, dan ia akan menjawab
 * apa pun yang fixture-nya katakan.
 *
 * ── Kenapa titik tren, bukan IKM kabupaten atau total responden ──────────────
 * `fullyParallel: true`, dan spec lain mengirim jawaban ke survei uji bersama
 * saat berkas ini berjalan. Angka ringkasan (IKM rata-rata, total responden)
 * ikut bergerak karenanya, sehingga membandingkannya sebelum/sesudah akan merah
 * karena tetangganya, bukan karena cacatnya. `PERIODE_UJI` di bawah dipilih
 * jauh di depan justru supaya tak ada data lain yang pernah menyentuhnya:
 * titik tren pada periode itu hanya dapat digerakkan oleh survei yang dibuat
 * berkas ini.
 *
 * ── Kenapa uji kedua ditandai `test.fail()` ──────────────────────────────────
 * Cacatnya BELUM diperbaiki. Menuliskannya sebagai harapan biasa berarti suite
 * merah setiap hari karena hal yang sudah diketahui, dan merah yang permanen
 * berhenti dibaca orang. `test.fail()` membalik arahnya: selama cacatnya ada,
 * suite hijau; begitu seseorang memperbaikinya, uji ini MERAH dan menuntut
 * anotasinya dicabut — sejak saat itu ia menjadi pagar regresi sungguhan.
 * Itulah pelajaran CAT-004, yang tiga minggu menganggur sebagai catatan lalu
 * menjelma jadi BUG-005 tanpa ada yang menangkapnya.
 *
 * ── Data uji ────────────────────────────────────────────────────────────────
 * Survei dimusnahkan permanen di `afterAll`, apa pun hasil ujinya. Judulnya
 * berawalan `[UJI ` supaya sisa yang lolos tetap terjaring
 * `e2e/support/bersihkan-data-uji.mjs`. Satu jejak memang tertinggal dan itu
 * BUG-014, bukan kelalaian berkas ini: notifikasi tak ikut terhapus saat survei
 * dimusnahkan.
 */

/** Triwulan yang tak dipakai data lain — lihat catatan di atas. */
const PERIODE_UJI = '2027-Q4';

const JUDUL = '[UJI BUG-013] Survei untuk pengunci statistik Sampah';

/** Nilai skala 1 dari satu-satunya unsur IKM ⇒ (1/4) × 100 = 25. */
const IKM_DIHARAPKAN = 25;

/**
 * Nilai tren IKM pada satu periode, atau `null` bila periode itu tak muncul
 * sama sekali. `GET /statistics` publik — sengaja dibaca tanpa token, persis
 * seperti pengunjung beranda membacanya.
 */
async function titikTren(periode) {
  const statistik = await panggilApi(null, 'GET', '/statistics');
  const titik = (statistik?.ikmTrend ?? []).find((t) => t.periode === periode);
  return titik ? titik.value : null;
}

// Kedua uji di bawah berbagi satu survei: yang pertama menyiapkan dan
// membuangnya, yang kedua membaca akibatnya. Mereka WAJIB berurutan.
test.describe.configure({ mode: 'serial' });

test.describe('BUG-013 — survei di Sampah dan angka publik', () => {
  let tokenOpd;
  let tokenKabupaten;
  let surveiId = null;

  test.beforeAll(async () => {
    tokenOpd = (await masukApi(AKUN.adminOpd, 'opd')).token;
    tokenKabupaten = (await masukApi(AKUN.adminKabupaten, 'kabupaten')).token;
  });

  test.afterAll(async () => {
    if (!surveiId) return;
    // Dibuang dulu bila uji pertama berhenti sebelum sempat membuangnya:
    // `purge` hanya menerima survei yang SUDAH berada di Sampah.
    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}`).catch(() => {});
    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}/purge`);
  });

  test('prasyarat — jawaban pada survei aktif memunculkan titik tren periodenya', async () => {
    // Bukan basa-basi: kalau periode ini sudah terpakai, seluruh pengukuran di
    // bawah membandingkan angka milik data lain.
    expect(
      await titikTren(PERIODE_UJI),
      `Periode ${PERIODE_UJI} sudah muncul di tren SEBELUM uji dimulai — ` +
        `kemungkinan sisa data uji yang belum dibersihkan. Jalankan ` +
        `e2e/support/bersihkan-data-uji.mjs lebih dulu.`,
    ).toBeNull();

    const survei = await panggilApi(tokenOpd, 'POST', '/surveys', {
      judul: JUDUL,
      periode: PERIODE_UJI,
    });
    surveiId = survei.id;

    await panggilApi(tokenOpd, 'POST', `/surveys/${surveiId}/questions`, {
      teks: 'Bagaimana kualitas layanan yang Anda terima?',
      tipe: 'skala',
      isIkmUnsur: true,
      kodeUnsur: 'U1',
    });

    // Pertanyaan hanya boleh ditambah selama draft — aktifkan paling akhir.
    await panggilApi(tokenOpd, 'PATCH', `/surveys/${surveiId}/status`, { status: 'aktif' });

    const tokenWarga = (await masukApi(AKUN.warga, 'responden')).token;
    const isian = await panggilApi(tokenWarga, 'GET', `/surveys/${surveiId}/fill`);
    const pertanyaan = isian?.questions?.[0];
    expect(pertanyaan, 'survei uji tak mengembalikan pertanyaan apa pun').toBeTruthy();

    await panggilApi(tokenWarga, 'POST', `/surveys/${surveiId}/responses`, {
      answers: [{ questionId: pertanyaan.id, nilai: 1 }],
      tanpaDataDiri: true,
    });

    // Inilah yang membuktikan alat ukurnya bekerja. Tanpa langkah ini, uji
    // berikutnya bisa hijau semata karena tak ada yang pernah tercatat.
    expect(
      await titikTren(PERIODE_UJI),
      'titik tren tak muncul padahal survei aktif sudah dijawab — ' +
        'alat ukur uji ini tidak bekerja, jadi hasil uji berikutnya tak berarti',
    ).toBe(IKM_DIHARAPKAN);

    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}`);

    const sampah = await panggilApi(tokenKabupaten, 'GET', '/surveys/trash');
    expect((sampah ?? []).map((s) => s.id)).toContain(surveiId);
  });

  test('survei yang sudah dibuang tak lagi menggerakkan tren IKM publik', async () => {
    test.fail(
      true,
      'BUG-013 masih terbuka: `DashboardService.getStatistics` membaca ' +
        '`prisma.ikmResult.findMany()` tanpa penyaring `survey.deletedAt: null`, ' +
        'sehingga snapshot milik survei di Sampah tetap terhitung. Cabut anotasi ' +
        'ini begitu penyaringnya dipasang — mulai saat itu berkas ini jadi pagar regresi.',
    );

    expect(
      await titikTren(PERIODE_UJI),
      'survei sudah berada di Sampah, tetapi periodenya masih membentuk titik tren publik',
    ).toBeNull();
  });
});
