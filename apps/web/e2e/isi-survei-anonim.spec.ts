import { expect, request, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BERKAS_TOKEN } from './global-setup';

/**
 * Alur pengisian survei TANPA sesi.
 *
 * URL absolut lewat `E2E_ORIGIN`, dan sejak 16 September 2026 nilai bakunya
 * sama persis dengan `baseURL` di `playwright.config.ts` (`http://skema.local`,
 * port 80). Sebelumnya config menunjuk `localhost:3000` yang tak melayani API,
 * dan berkas ini mengelak dengan memakai origin sendiri; sekarang keduanya
 * membaca env yang sama sehingga tak bisa berselisih diam-diam.
 *
 * MASUK LEWAT `/isi/:id`, MENDARAT DI `/survei/:id` (22 Oktober 2026).
 * Alamat lama dialihkan permanen (308) sejak 8 September 2026 demi QR yang
 * sudah tercetak dan tersebar; alasannya ditulis lengkap di
 * `src/app/isi/[id]/page.jsx`. Sampai hari ini berkas ini masih menuntut URL
 * TETAP di `/isi/:id` -- harapan yang benar sebelum 8 September dan salah sejak
 * saat itu. Tak ada yang pernah melihatnya karena berkas ini selalu melewati
 * dirinya sendiri, jadi harapan basi itu menginap enam minggu tanpa dibantah
 * satu kali pun. Pintu masuknya sengaja DIPERTAHANKAN di alamat lama: justru
 * pengalihan itulah yang menjaga QR cetak tetap berguna, dan memindahkan uji
 * ini langsung ke `/survei/:id` akan membuangnya dari pengujian.
 *
 * SURVEINYA DISIAPKAN SENDIRI (22 Oktober 2026). Dulu berkas ini menuntut
 * `E2E_SURVEY_ANONIM_ID` diisi tangan, dan karena hampir tak pernah diisi, ia
 * melewati dirinya pada setiap jalan -- termasuk pada setiap jalan yang
 * dilaporkan hijau. Sekarang ia membuat survei SKM berpenanda `[UJI ` sendiri
 * lalu mengaktifkannya; `bersihkan-data-uji.mjs` menghapusnya beserta seluruh
 * responsnya. Env-nya tetap dihormati bila diisi, untuk menguji survei tertentu.
 *
 * TIDAK MEMAKAI survei seed yang kebetulan aktif dan anonim. Respons yang masuk
 * ke sana tidak berpenanda `[UJI `, sehingga pembersih tak dapat mengambilnya
 * kembali dan angka IKM survei sungguhan bergeser permanen.
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';

/**
 * Batas waktu dilonggarkan dari 30 detik bawaan: satu jalan di sini melewati
 * gerbang persetujuan lalu sembilan unsur SKM satu per satu, dan server dev
 * Next mengompilasi rutenya pada pembukaan pertama.
 */
test.describe.configure({ timeout: 120_000 });

/** Id survei yang dipakai seluruh berkas ini; `undefined` berarti dilewati. */
let surveyId: string | undefined;

function bacaToken(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(BERKAS_TOKEN, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Menerbitkan satu survei SKM aktif ber-`izinkanAnonim`.
 *
 * `opdId` DIAMBIL dari `/auth/me`, tidak ditanam: nomor OPD berbeda di tiap
 * mesin, dan angka tetap di sini akan mengulang persis kesalahan nomor tiket
 * yang baru saja dibereskan di dua berkas sebelah.
 *
 * Status diubah lewat `PATCH /surveys/:id/status`, bukan `PATCH /surveys/:id`:
 * yang terakhir menolak medan `status` dengan 400 "property status should not
 * exist". Terukur 22 Oktober 2026.
 */
async function siapkanSurvei(): Promise<string | undefined> {
  if (process.env.E2E_SURVEY_ANONIM_ID) return process.env.E2E_SURVEY_ANONIM_ID;

  const token = bacaToken();
  const tok = token.kabupaten ?? token.opd;
  if (!tok) return undefined;

  const api = await request.newContext({ baseURL: ORIGIN });
  const headers = { Authorization: `Bearer ${tok}` };
  try {
    const me = await api.get('/api/v1/auth/me', { headers });
    const opdId: number | null = me.ok() ? ((await me.json()).data?.opdId ?? null) : null;
    if (!opdId) return undefined;

    const dibuat = await api.post('/api/v1/surveys', {
      headers,
      data: {
        judul: `[UJI isi-anonim] ${new Date().toISOString()}`,
        periode: '2026-Q4',
        jenis: 'skm_permenpanrb',
        izinkanAnonim: true,
        opdId,
      },
    });
    if (!dibuat.ok()) return undefined;
    const id: number = (await dibuat.json()).data.id;

    const aktif = await api.patch(`/api/v1/surveys/${id}/status`, {
      headers,
      data: { status: 'aktif' },
    });
    if (!aktif.ok()) return undefined;

    return String(id);
  } finally {
    await api.dispose();
  }
}

/**
 * Melewati gerbang persetujuan PDP yang berdiri di depan kuesionernya.
 *
 * Gerbang ini menuntut UU 27/2022 dan menawarkan data diri yang BOLEH
 * dikosongkan; tombol "Setuju & Mulai Isi" mati sampai kotak persetujuan
 * wajibnya dicentang. Berkas ini tak pernah melewatinya karena ia memang belum
 * ada ketika uji ini ditulis, dan karena berkas ini kemudian selalu melewati
 * dirinya sendiri, lapisan baru itu tak pernah tertangkap sampai 22 Oktober
 * 2026.
 *
 * Dijalankan HANYA bila gerbangnya memang muncul: survei yang ditunjuk lewat
 * `E2E_SURVEY_ANONIM_ID` bisa saja sudah melewatinya, dan menuntut gerbang yang
 * tak ada akan menggantikan satu kegagalan palsu dengan kegagalan palsu lain.
 */
async function lewatiGerbangPersetujuan(page: Page): Promise<void> {
  const mulai = page.getByRole('button', { name: /Setuju & Mulai Isi/i });
  const pertanyaan = page.getByRole('heading', { name: /^Pertanyaan \d+ dari \d+$/ });

  /**
   * MENUNGGU SALAH SATU DARI DUA KEADAAN, bukan memeriksa seketika.
   * `isVisible()` tidak menunggu apa pun: dipanggil tepat sesudah `goto`, ia
   * menjawab `false` karena React belum sempat merender gerbangnya, lalu
   * pembantu ini pulang diam-diam dan ujinya mencari pilihan skala di halaman
   * yang masih menampilkan formulir persetujuan. Terukur 22 Oktober 2026 --
   * uji papan ketik memerah dengan "element(s) not found" sementara sondaan
   * manual atas halaman yang sama menemukan keempat radionya.
   */
  await expect(mulai.or(pertanyaan).first()).toBeVisible({ timeout: 30_000 });
  if (!(await mulai.isVisible())) return;

  // Data diri dilewati dengan sengaja: yang diuji di sini jalur ANONIM, dan
  // mengisinya justru menjauhkan uji ini dari keadaan yang hendak diwakilinya.
  await page.getByRole('checkbox', { name: /Isi survei tanpa data diri/i }).check();
  await page.getByRole('checkbox', { name: /menyetujui pemrosesan data saya/i }).check();

  await expect(mulai, 'tombol mulai tetap mati sesudah persetujuan dicentang').toBeEnabled();
  await mulai.click();
}

/** Apa yang sungguh terjadi di modal kirim, supaya uji di bawah dapat bercabang. */
type HasilKirim = 'tersimpan' | 'captcha-gagal';

/**
 * Menekan "Kirim Survei" di dalam modal, lalu MELAPORKAN apa yang terjadi.
 *
 * BERCABANG DENGAN SENGAJA (22 Oktober 2026). Tombol ini mati sampai Turnstile
 * menerbitkan token, dan di mesin pengembangan token itu bisa tak pernah
 * datang: kunci situs yang terpasang terikat daftar domain yang tidak memuat
 * `skema.local`, sehingga tak satu pun iframe Cloudflare terbit. Terukur 22
 * Oktober 2026 -- nol iframe, dan sesudah 15 detik modalnya memunculkan
 * peringatan BUG-016 beserta tombol muat ulang.
 *
 * Memaksa uji ini menuntut `201` di mesin seperti itu menghasilkan MERAH PALSU
 * atas keadaan yang justru ditangani produk dengan benar. Memakluminya dengan
 * `test.skip` menghasilkan HIJAU PALSU, dan itu pola yang baru saja dibereskan
 * di berkas ini juga. Jadi keduanya ditolak: fungsi ini mengembalikan cabang
 * mana yang terjadi, dan pemanggilnya mengasersi cabang itu sampai tuntas.
 * Tak ada keadaan yang lolos tanpa diperiksa.
 */
async function kirimDariModal(page: Page, id: string): Promise<HasilKirim> {
  const kirim = page.getByRole('button', { name: /^Kirim( Survei)?$/ });

  /**
   * DISARING ISINYA, bukan `getByRole('alert').first()`.
   *
   * Next memasang `<div role="alert" aria-live="assertive"
   * id="__next-route-announcer__">` di setiap halaman untuk mengumumkan
   * perpindahan rute, dan div itu SELALU ada serta hampir selalu kosong.
   * Mencocokkan peran saja membuat `count() > 0` bernilai benar sejak detik
   * pertama, sehingga percabangan di bawah langsung menyimpulkan captcha gagal
   * padahal belum ada yang gagal. Terukur 22 Oktober 2026.
   */
  const peringatan = page
    .getByRole('alert')
    .filter({ hasText: /verifikasi keamanan gagal dimuat/i });

  // Tenggat captcha di ModalKirimSurvei 15 detik; diberi kelonggaran supaya
  // cabangnya ditentukan oleh keadaan, bukan oleh perlombaan pewaktu.
  await expect
    .poll(
      async () =>
        (await kirim.isEnabled().catch(() => false))
          ? 'siap'
          : (await peringatan.count()) > 0
            ? 'gagal'
            : 'menunggu',
      { timeout: 45_000, message: 'captcha tak menerbitkan token DAN tak memunculkan peringatan' },
    )
    .not.toBe('menunggu');

  if (!(await kirim.isEnabled())) {
    // Cabang kedua: captcha tak dapat dimuat. Yang diasersi penanganannya --
    // persis yang dijanjikan BUG-016 -- bukan sekadar "tidak terkirim".
    await expect(peringatan.first()).toContainText(/verifikasi keamanan gagal dimuat/i);
    await expect(page.getByRole('button', { name: /Muat Ulang Verifikasi/i })).toBeEnabled();
    await expect(kirim, 'tombol kirim harus TETAP terkunci sesudah captcha gagal').toBeDisabled();
    return 'captcha-gagal';
  }

  const respons = page.waitForResponse(
    (r) => r.url().includes(`/public/surveys/${id}/responses`) && r.request().method() === 'POST',
  );
  await kirim.click();
  expect((await respons).status()).toBe(201);
  return 'tersimpan';
}

/**
 * Mengisi seluruh pertanyaan sampai jawabannya benar-benar TERSIMPAN.
 *
 * Yang ditunggu respons `201` dari servernya, bukan sekadar layar ucapan
 * terima kasih: layar itu dapat muncul dari keadaan klien mana pun, sedangkan
 * 201 hanya terbit kalau barisnya sungguh masuk basis data.
 */
async function isiSampaiTersimpan(page: Page, id: string): Promise<HasilKirim> {
  await lewatiGerbangPersetujuan(page);

  /**
   * DIPILIH LEWAT `<label>` PEMBUNGKUSNYA, bukan lewat `getByRole('radio')`.
   *
   * `RadioCard.jsx:21` merender `<input type="radio" className="hidden peer">`,
   * dan `hidden` adalah `display: none` -- yang membuang input itu dari pohon
   * aksesibilitas, sehingga `getByRole('radio')` mengembalikan NOL dan loop ini
   * dulu melaju ke tombol lanjut yang masih mati. Pemilihnya struktural (label
   * yang memuat radio), bukan berdasarkan kelas Tailwind maupun teks labelnya:
   * kelas berubah saat gaya dirapikan, dan teks label skala memang boleh
   * diganti pengelola survei sampai survei ditutup.
   */
  const pilihJawaban = async () => {
    const pilihan = page.locator('label:has(input[type="radio"])');
    if ((await pilihan.count()) > 0) await pilihan.last().click();
  };

  for (let i = 0; i < 25; i += 1) {
    /**
     * PENGIRIMANNYA BERTINGKAT, dan itu yang dulu tak terbaca berkas ini:
     * pertanyaan terakhir tidak menawarkan "Pertanyaan Selanjutnya" melainkan
     * "Selesaikan", yang membuka `ModalKirimSurvei` berisi verifikasi
     * Turnstile; barulah di dalam modal itu ada "Kirim Survei". Loop lama
     * menunggu "Selanjutnya" di layar ke-9 yang tombolnya sudah berganti nama,
     * lalu habis waktu tanpa pernah mengirim apa pun.
     *
     * Jawaban dipilih LEBIH DULU pada tiap putaran, sebab ketiga tombol di
     * bawah mati sampai pertanyaan yang sedang tampil terjawab.
     */
    const kirim = page.getByRole('button', { name: /^Kirim( Survei)?$/ });
    if (await kirim.isVisible().catch(() => false)) {
      return kirimDariModal(page, id);
    }

    await pilihJawaban();

    /**
     * DITUNGGU DULU SALAH SATUNYA, baru dipilih. `isVisible()` tidak menunggu
     * apa pun: dipanggil tepat sesudah pertanyaan berganti, ia menjawab `false`
     * untuk "Selesaikan" yang belum sempat dirender, lalu loop ini memilih
     * "Pertanyaan Selanjutnya" yang justru TIDAK ADA di layar terakhir dan
     * menunggu sampai habis waktu. Terukur 22 Oktober 2026 sebagai uji goyah:
     * percobaan pertama habis di 2 menit, ulangannya lulus di 38 detik.
     */
    const lanjut = page.getByRole('button', { name: /^(Pertanyaan Selanjutnya|Selanjutnya)$/ });
    const selesaikan = page.getByRole('button', { name: /^Selesaikan$/ });
    await expect(lanjut.or(selesaikan).first()).toBeVisible({ timeout: 20_000 });
    const tombol = (await selesaikan.isVisible()) ? selesaikan : lanjut;

    await expect(tombol, 'tombol lanjut tetap mati sesudah jawaban dipilih').toBeEnabled({
      timeout: 15_000,
    });
    await tombol.click();
  }
  throw new Error('Tombol kirim tak pernah muncul sesudah 25 langkah.');
}

test.describe('/isi/:id tanpa sesi', () => {
  test.beforeAll(async () => {
    surveyId = await siapkanSurvei();
  });

  /**
   * Dilewati di dalam tiap uji, BUKAN di tingkat `describe`: syarat tingkat
   * describe dinilai saat uji dikumpulkan, jauh sebelum `beforeAll` sempat
   * menerbitkan surveinya, sehingga seluruh berkas akan selalu dilewati.
   */
  const pastikanAda = () => {
    test.skip(
      !surveyId,
      'Tak ada survei anonim: jalankan dengan E2E_IDENTIFIER=<akun ber-OPD> ' +
        'atau setel E2E_SURVEY_ANONIM_ID. Dilewati, BUKAN lulus.',
    );
    return surveyId as string;
  };

  // Kedua tahap berada dalam SATU test dan satu konteks peramban dengan sengaja:
  // tahap kedua bergantung pada `localStorage` yang ditinggalkan tahap pertama.
  // Memecahnya menjadi dua `test` membuat Playwright memberi konteks bersih dan
  // penanda itu hilang -- uji akan gagal karena isolasi, bukan karena cacat.
  test('mengisi sampai tersimpan, lalu pengisian kedua ditolak di antarmuka', async ({ page }) => {
    const id = pastikanAda();
    await page.goto(`${ORIGIN}/isi/${id}`);

    // Bukti pertama: pengalihan 308 mendarat di alamat barunya, dan proxy TIDAK
    // memantulkannya ke '/'. Keduanya terjawab sekaligus oleh pola ini.
    await expect(page).toHaveURL(new RegExp(`/survei/${id}$`));
    await expect(page.getByText('Memuat survei...')).toHaveCount(0, { timeout: 20_000 });

    const hasil = await isiSampaiTersimpan(page, id);

    // Captcha tak dapat dimuat di mesin ini: penanganannya sudah diasersi utuh
    // di dalam `kirimDariModal`, dan tahap-tahap di bawah memang menuntut
    // jawaban yang tersimpan. Berhenti di sini dengan jejak yang tersurat,
    // bukan dengan kegagalan atas cacat yang tidak ada.
    if (hasil === 'captcha-gagal') {
      test.info().annotations.push({
        type: 'captcha',
        description:
          'Turnstile tak menerbitkan token di mesin ini; yang diuji jalur mundur BUG-016. ' +
          'Pengiriman anonim sampai 201 terbukti di apps/api e2e public-surveys.e2e-spec.ts.',
      });
      return;
    }

    await expect(page.getByText('Terima Kasih!')).toBeVisible();
    // Pengisi anonim tak boleh diberi tautan ke rute khusus warga -- proxy akan
    // memantulkannya ke `/` dan itu terasa seperti aplikasi rusak.
    await expect(page.getByRole('button', { name: /Kembali ke Layanan/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar Survei/ })).toHaveCount(0);

    // Tahap kedua: penanda peramban menolak pengisian ulang.
    await page.goto(`${ORIGIN}/isi/${id}`);
    await expect(page.getByText('Anda Sudah Mengisi Survei Ini')).toBeVisible({
      timeout: 20_000,
    });
  });

  /**
   * PAPAN KETIK SAJA, tanpa tetikus sama sekali.
   *
   * `RadioCard.jsx` merender `<input type="radio">` lalu menyembunyikannya
   * dengan `hidden`, yang berarti `display: none`. Elemen ber-`display: none`
   * dibuang dari pohon aksesibilitas DAN dari urutan Tab, sehingga kuesioner
   * survei -- sembilan unsur wajib menurut PermenPANRB 14/2017 -- tak dapat
   * dijawab sama sekali oleh orang yang tidak memakai tetikus. Terukur 22
   * Oktober 2026: `getByRole('radio')` mengembalikan nol pada halaman yang
   * jelas-jelas menampilkan empat pilihan skala.
   *
   * KENAPA DI SINI, BUKAN DI JEST. jsdom tidak memuat Tailwind sama sekali,
   * jadi di sana `hidden` hanyalah sebuah kelas tanpa akibat: radionya tetap
   * terbaca `getByRole` dan ujinya akan HIJAU justru pada keadaan yang rusak.
   * Hanya peramban sungguhan yang menghitung `display: none`.
   */
  test('kuesioner dapat dijawab dengan papan ketik saja', async ({ page }) => {
    const id = pastikanAda();
    await page.goto(`${ORIGIN}/survei/${id}`);
    await lewatiGerbangPersetujuan(page);

    const radio = page.getByRole('radio');
    await expect(radio.first(), 'pilihan skala tak terbaca sebagai radio').toBeVisible({
      timeout: 20_000,
    });

    // Tab sampai salah satu pilihan menerima fokus. Dibatasi supaya kegagalan
    // berhenti sebagai kegagalan, bukan sebagai uji yang menggantung.
    let terfokus = false;
    for (let i = 0; i < 30 && !terfokus; i += 1) {
      await page.keyboard.press('Tab');
      terfokus = await radio.first().evaluate((el) => el === document.activeElement);
    }
    expect(terfokus, 'tak satu pun pilihan skala dapat dicapai dengan Tab').toBe(true);

    // Papan ketik memilih, lalu tombol lanjutnya harus hidup. Itu buktinya
    // jawabannya benar-benar masuk, bukan sekadar fokusnya berpindah.
    await page.keyboard.press('Space');
    const lanjut = page.getByRole('button', { name: /^(Pertanyaan Selanjutnya|Selesaikan)$/ });
    await expect(lanjut, 'jawaban dari papan ketik tidak tercatat').toBeEnabled({
      timeout: 10_000,
    });
  });

  /**
   * KENDALI, dan sampai 22 Oktober 2026 ia HAMPA: isinya hanya menyatakan bahwa
   * kalimat "Anda Sudah Mengisi Survei Ini" TIDAK ada. Ketiadaan sebuah kalimat
   * juga sifat halaman galat, halaman kosong, dan halaman hasil pengalihan yang
   * salah -- jadi ia lulus tanpa pernah mengisi apa pun. Terukur pada jalan
   * pertama yang benar-benar menjalankannya: ia hijau sementara surveinya
   * mencatat NOL respons.
   *
   * Sekarang ia harus membuktikan hal yang positif: peramban baru tanpa penanda
   * benar-benar dapat mengisi sampai tersimpan. Batas penanda peramban
   * dinyatakan terus terang di `surveyFillMarker.js` -- berpindah peramban
   * mengalahkannya -- dan uji ini merekam batas itu sebagai perilaku yang
   * DIKETAHUI, bukan cacat yang tak sengaja lolos.
   */
  test('KENDALI: peramban baru (tanpa penanda) benar-benar dapat mengisi', async ({ browser }) => {
    const id = pastikanAda();
    const konteks = await browser.newContext();
    const halaman = await konteks.newPage();

    try {
      await halaman.goto(`${ORIGIN}/isi/${id}`);
      await expect(halaman.getByText('Anda Sudah Mengisi Survei Ini')).toHaveCount(0, {
        timeout: 20_000,
      });

      if ((await isiSampaiTersimpan(halaman, id)) === 'tersimpan') {
        await expect(halaman.getByText('Terima Kasih!')).toBeVisible();
      }
    } finally {
      await konteks.close();
    }
  });
});
