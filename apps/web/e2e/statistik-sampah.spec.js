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
 * ── `test.fail()` SUDAH DICABUT, dan mekanismenya bekerja (19 Oktober 2026) ──
 * Uji kedua di bawah dulu ditandai `test.fail()` karena cacatnya belum
 * diperbaiki. Alasannya: menuliskannya sebagai harapan biasa berarti suite merah
 * setiap hari karena hal yang sudah diketahui, dan merah yang permanen berhenti
 * dibaca orang. `test.fail()` membalik arahnya — selama cacatnya ada suite
 * hijau, dan begitu seseorang memperbaikinya uji ini MERAH dengan bunyi
 * "Expected to fail, but passed" lalu menuntut anotasinya dicabut.
 *
 * Itu benar-benar terjadi. BUG-013 diperbaiki di `main` pada 19 Oktober 2026
 * (tujuh penyaring `deletedAt: null` yang hilang, bukan satu seperti yang
 * laporannya sebut), lalu `main` ditarik ke cabang ini pada hari yang sama.
 * Anotasinya dicabut di sini; SPECNYA TIDAK DIHAPUS. Sejak saat ini ia pagar
 * regresi sungguhan: bila penyaring itu hilang lagi, uji di bawah memerah.
 *
 * Itulah pelajaran CAT-004, yang tiga minggu menganggur sebagai catatan lalu
 * menjelma jadi BUG-005 tanpa ada yang menangkapnya.
 *
 * ── SPEC INI BASI TERHADAP KONTRAK SURVEI, DAN DIPERBAIKI (20 Oktober 2026) ──
 * Jalan pertama sesudah `main` ditarik ke cabang ini dijawab
 * `POST /surveys ⇒ HTTP 400: Validation failed`, dan uji kedua tak pernah
 * jalan sama sekali. Sebabnya bukan cacat aplikasi melainkan kontrak survei
 * yang bergerak sejak 8 Oktober 2026, dan ia mengubah TIGA hal sekaligus:
 *
 *   1. `jenis` wajib pada `POST /surveys` (`create-survey.dto.ts`, tanpa
 *      `@IsOptional()`); berkas ini dulu hanya mengirim judul dan periode;
 *   2. survei `skm_permenpanrb` LAHIR dengan sembilan unsur baku
 *      (`surveys.service.ts`, `questions: { create: buatUnsurAwal() }`),
 *      sehingga langkah `POST /surveys/:id/questions` yang lama bukan cuma
 *      tak perlu — ia DITOLAK `assertBolehBuatPertanyaan`, yang melarang
 *      menambah unsur pada survei SKM;
 *   3. setiap pertanyaan skala WAJIB dijawab (`responses.service.ts`), jadi
 *      satu jawaban saja dijawab 400 oleh pemeriksa kelengkapan.
 *
 * Pelajarannya bukan "tambahkan satu medan". Ditemukan dengan MENJALANKANNYA,
 * bukan dengan membacanya: kegagalannya menunjuk medan `jenis` saja, dan dua
 * aturan sisanya baru terlihat sesudah kodenya dibaca mundur dari situ.
 *
 * ── ANGKA PUBLIKNYA DISINGGAHKAN 60 DETIK, DAN ITU DISENGAJA ─────────────────
 * `GET /statistics` disinggahkan di bawah kunci `statistik-publik` dengan TTL
 * 60 detik (`dashboard.service.ts`), dan TAK ADA yang membatalkannya: satu-
 * satunya penyebutan lain kunci itu di seluruh `apps/api/src` adalah sebuah
 * komentar. `ResponsesService` membatalkan singgahan HITUNGAN IKM, bukan
 * singgahan statistik publik.
 *
 * Akibatnya langsung mengenai berkas ini. Versi lamanya membaca `/statistics`
 * tiga kali dalam setengah detik dan menuntut tiap bacaan sudah memuat tulisan
 * yang baru saja terjadi; singgahannya lahir 8-9 Oktober 2026, specnya lebih
 * tua, dan jalan 20 Oktober 2026 menjawab `Expected: 25, Received: null`.
 * Bukan cacat aplikasi, dan bukan pula angka 25 yang salah.
 *
 * Karena itu setiap pembacaan di bawah memakai `expect.poll` dengan tenggat
 * sedikit DI ATAS TTL. Konsekuensinya disebut tersurat alih-alih disembunyikan:
 * lewat endpoint publik, berkas ini hanya dapat membuktikan kebenaran yang
 * AKHIRNYA tercapai, bukan yang seketika. Mengosongkan Redis dari dalam spec
 * ditolak: itu menyentuh infrastruktur bersama, dan membuat pengukurannya tak
 * lagi mewakili apa yang dilihat pengunjung.
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

/**
 * Kesembilan unsur dijawab `nilai: 1` semuanya.
 *
 * Bobot tiap unsur `1/9` dan NRR tiap unsur `1`, jadi jumlah tertimbangnya `1`
 * dan nilai IKM-nya `1 × 25 = 25` (`ikm.service.ts`: bobot = 1 ÷ jumlah unsur,
 * nilai IKM = Σ NRR tertimbang × 25).
 *
 * Komentar lama di sini berbunyi `(1/4) × 100 = 25` dan menyebut "satu-satunya
 * unsur IKM". Angkanya kebetulan sama, jalannya keliru, dan premisnya sudah
 * tidak berlaku sejak survei SKM selalu membawa sembilan unsur.
 */
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

/**
 * Tenggat bawaan Playwright 30 detik, dan dua jendela singgahan 60 detik tak
 * mungkin tertampung di dalamnya. `timeout: 180_000` di `playwright.config.ts`
 * BUKAN tenggat uji -- ia milik blok `webServer`.
 */
const TENGGAT_UJI_MS = 150_000;

/** Sedikit di atas TTL 60 detik, supaya satu jendela basi tak memerahkannya. */
const TENGGAT_SINGGAHAN_MS = 70_000;

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
    test.setTimeout(TENGGAT_UJI_MS);

    // Bukan basa-basi: kalau periode ini sudah terpakai, seluruh pengukuran di
    // bawah membandingkan angka milik data lain. Sekali baca saja cukup di
    // sini: yang dicari justru KETIADAAN, dan bacaan basi paling buruk hanya
    // menunda kegagalannya satu jendela, tidak meluluskannya.
    expect(
      await titikTren(PERIODE_UJI),
      `Periode ${PERIODE_UJI} sudah muncul di tren SEBELUM uji dimulai — ` +
        `kemungkinan sisa data uji yang belum dibersihkan. Jalankan ` +
        `e2e/support/bersihkan-data-uji.mjs lebih dulu.`,
    ).toBeNull();

    // `jenis` WAJIB, dan `skm_permenpanrb` yang dipilih sebab hanya survei SKM
    // yang menghasilkan nilai IKM — `custom` tak pernah membentuk titik tren,
    // sehingga seluruh pengukuran di bawah akan mengukur ketiadaan. `tujuan`
    // dan `metodeNilai` sengaja TIDAK dikirim: keduanya dijawab 400 pada SKM.
    const survei = await panggilApi(tokenOpd, 'POST', '/surveys', {
      judul: JUDUL,
      periode: PERIODE_UJI,
      jenis: 'skm_permenpanrb',
    });
    surveiId = survei.id;

    // Tak ada pertanyaan yang ditambahkan: sembilan unsur baku sudah lahir
    // bersama surveinya, dan menambah unsur pada survei SKM memang dilarang.
    await panggilApi(tokenOpd, 'PATCH', `/surveys/${surveiId}/status`, { status: 'aktif' });

    const tokenWarga = (await masukApi(AKUN.warga, 'responden')).token;
    const isian = await panggilApi(tokenWarga, 'GET', `/surveys/${surveiId}/fill`);
    const skala = (isian?.questions ?? []).filter((q) => q.tipe === 'skala');

    // Bukan basa-basi: bobot IKM-nya `1 ÷ jumlah unsur`, jadi jumlah unsur yang
    // berbeda membuat angka 25 di bawah menjadi salah tanpa ada yang memerah.
    expect(skala, 'survei SKM uji tak mengembalikan kesembilan unsur bakunya').toHaveLength(9);

    // SEMUANYA dijawab, bukan satu: pemeriksa kelengkapan menolak jawaban yang
    // melewatkan satu pertanyaan skala pun.
    await panggilApi(tokenWarga, 'POST', `/surveys/${surveiId}/responses`, {
      answers: skala.map((q) => ({ questionId: q.id, nilai: 1 })),
      tanpaDataDiri: true,
    });

    // Inilah yang membuktikan alat ukurnya bekerja. Tanpa langkah ini, uji
    // berikutnya bisa hijau semata karena tak ada yang pernah tercatat.
    //
    // `poll`, bukan sekali baca: singgahan 60 detik di depan `/statistics`
    // membuat bacaan pertama hampir pasti masih memuat keadaan sebelum survei
    // ini dijawab.
    await expect
      .poll(() => titikTren(PERIODE_UJI), {
        timeout: TENGGAT_SINGGAHAN_MS,
        message:
          'titik tren tak muncul padahal survei aktif sudah dijawab, bahkan ' +
          'sesudah menunggu lewat jendela singgahan — alat ukur uji ini tidak ' +
          'bekerja, jadi hasil uji berikutnya tak berarti',
      })
      .toBe(IKM_DIHARAPKAN);

    await panggilApi(tokenKabupaten, 'DELETE', `/surveys/${surveiId}`);

    const sampah = await panggilApi(tokenKabupaten, 'GET', '/surveys/trash');
    expect((sampah ?? []).map((s) => s.id)).toContain(surveiId);
  });

  test('survei yang sudah dibuang tak lagi menggerakkan tren IKM publik', async () => {
    // Anotasi `test.fail()` DICABUT 19 Oktober 2026, bukan specnya yang dihapus.
    //
    // Yang dulu tertulis di sini: "BUG-013 masih terbuka —
    // `DashboardService.getStatistics` membaca `prisma.ikmResult.findMany()`
    // tanpa penyaring `survey.deletedAt: null`, sehingga snapshot milik survei
    // di Sampah tetap terhitung." Penyaringnya sudah dipasang, dan ternyata
    // bukan satu tempat melainkan TUJUH; lihat blok Penutupan BUG-013 di
    // `docs/BUG_REPORTS.md`.
    //
    // Pernyataan di bawah kini harapan biasa, dan itulah tujuannya sejak awal.

    test.setTimeout(TENGGAT_UJI_MS);

    await expect
      .poll(() => titikTren(PERIODE_UJI), {
        timeout: TENGGAT_SINGGAHAN_MS,
        message:
          'survei sudah berada di Sampah, tetapi periodenya masih membentuk ' +
          'titik tren publik bahkan sesudah jendela singgahan terlewati',
      })
      .toBeNull();
  });
});
