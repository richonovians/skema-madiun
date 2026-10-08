import { readFileSync } from 'node:fs';
import { request, type Page } from '@playwright/test';
import { BERKAS_TOKEN } from './global-setup';
import { expect, LEBAR_PONSEL_UMUM, test, ukurLuberan } from './fixtures/responsif';

/**
 * TATA LETAK KERANGKA 9 UNSUR (8 Oktober 2026).
 *
 * Ditulis karena dua cacat tata letak lolos dari seluruh uji jsdom (jsdom tak
 * memuat CSS) dan baru terlihat di Chrome:
 *
 *  1. Layar pemilih jenis di `/admin-opd/surveys/builder/new` tampil sebagai
 *     kolom 64px dengan teks bertumpuk. Penyebabnya `max-w-3xl`: tema proyek
 *     mendefinisikan `--spacing-3xl: 64px`, dan di sini token spasi itulah
 *     yang dipakai Tailwind untuk `max-w-3xl`, bukan 48rem bawaannya. Kelas
 *     `max-w-<xs..3xl>` TIDAK dapat dipercaya di repo ini.
 *  2. Modal "Buat Survei" Admin Kabupaten bertinggi tetap dan nyaris penuh,
 *     sehingga pilihan jenis yang menambah tinggi isi berisiko meluap ke
 *     footer.
 *
 * Suite ini hanya MEMBACA: fixture `responsif` membatalkan setiap permintaan
 * non-GET di tingkat jaringan. Menjalankannya (butuh akun ber-tiga-peran):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/kerangka-unsur-tata-letak.spec.ts
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';

interface SurveiRingkas {
  id: number;
  jenis?: string;
  status: string;
  respondentsCount?: number;
}

/** GET read-only memakai token kabupaten yang diterbitkan global-setup. */
async function ambilSurvei(): Promise<SurveiRingkas[]> {
  let token = '';
  try {
    token = (JSON.parse(readFileSync(BERKAS_TOKEN, 'utf8')) as Record<string, string>).kabupaten;
  } catch {
    return [];
  }
  if (!token) return [];
  const api = await request.newContext({
    baseURL: ORIGIN,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  try {
    const res = await api.get('/api/v1/surveys?limit=100');
    return res.ok() ? ((await res.json()).data as SurveiRingkas[]) : [];
  } finally {
    await api.dispose();
  }
}

/**
 * Survei Custom wajib memilih TUJUAN dan METODE NILAI sebelum dialog konfirmasi
 * (8 Oktober 2026): klik kartu Custom menampilkan dua isian, lalu "Lanjutkan".
 */
async function pilihCustomLengkap(page: Page): Promise<void> {
  await page.getByRole('radiogroup', { name: /jenis survei/i }).locator('label').nth(1).click();
  await page.getByRole('radio', { name: 'Kepuasan', exact: true }).check();
  await page.getByRole('radio', { name: 'Nilai rata-rata', exact: true }).check();
  await page.getByRole('button', { name: /^lanjutkan$/i }).click();
}

test.describe('pemilih jenis survei baru — Admin OPD', () => {
  test('desktop: dua kartu berdampingan, lebar layak, teks tidak bertumpuk', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

    const grup = page.getByRole('radiogroup', { name: /jenis survei/i });
    await expect(grup, 'pemilih jenis tak muncul').toBeVisible();

    const kotakGrup = (await grup.boundingBox())!;
    // Bukan kolom 64px: lebar grup harus menyentuh batas wajar halaman (768px).
    expect(kotakGrup.width, 'grup pemilih menyempit').toBeGreaterThanOrEqual(600);

    const kartu = grup.locator('label');
    await expect(kartu).toHaveCount(2);
    const a = (await kartu.nth(0).boundingBox())!;
    const b = (await kartu.nth(1).boundingBox())!;
    expect(a.width, 'kartu SKM menyempit').toBeGreaterThanOrEqual(260);
    expect(b.width, 'kartu Umum menyempit').toBeGreaterThanOrEqual(260);
    // Berdampingan tanpa tumpang tindih.
    expect(a.x + a.width, 'kartu saling menimpa').toBeLessThanOrEqual(b.x + 1);

    // Teks tiap kartu tidak melampaui kartunya sendiri.
    for (const i of [0, 1]) {
      const meluap = await kartu.nth(i).evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(meluap, `teks kartu ${i + 1} meluap`).toBe(false);
    }

    // Judul halaman tidak dipatahkan per kata (gejala kolom sempit).
    const judul = page.getByRole('heading', { name: /jenis survei/i });
    const kotakJudul = (await judul.boundingBox())!;
    expect(kotakJudul.height, 'judul terpatah menjadi banyak baris').toBeLessThan(60);
  });

  test('ponsel: kartu bertumpuk selebar layar dan tanpa luberan mendatar', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize(LEBAR_PONSEL_UMUM);
    await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

    const grup = page.getByRole('radiogroup', { name: /jenis survei/i });
    await expect(grup).toBeVisible();
    expect((await grup.boundingBox())!.width, 'grup menyempit di ponsel').toBeGreaterThanOrEqual(
      280,
    );

    const ukuran = await ukurLuberan(page);
    expect(ukuran.luberHalaman, `halaman meluber ${ukuran.luberHalaman}px`).toBe(0);
    expect(ukuran.pelanggar, JSON.stringify(ukuran.pelanggar)).toHaveLength(0);
  });

  test('memilih Survei Custom membuka kanvas, dan jenis dapat diganti selama belum ada yang dibuat', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

    // Klik kartunya, BUKAN `radio.check()` pada kartu jenis: begitu dipilih, pemilih
    // diganti kanvas sehingga `check()` menunggu keadaan 'tercentang' pada elemen yang
    // sudah hilang. Custom lebih dulu meminta tujuan + metode, lalu konfirmasi.
    await pilihCustomLengkap(page);
    await page.getByRole('button', { name: /ya, pilih jenis ini/i }).click();
    await expect(page.getByText('Skala Nilai 1-4')).toBeVisible();

    await page.getByRole('button', { name: /ganti jenis/i }).click();
    await expect(page.getByRole('radiogroup', { name: /jenis survei/i })).toBeVisible();
  });
});

test.describe('konfirmasi jenis survei — Admin OPD', () => {
  for (const [nama, ukuran] of [
    ['desktop', { width: 1366, height: 768 }],
    ['ponsel', LEBAR_PONSEL_UMUM],
  ] as const) {
    test(`${nama}: dialog muncul utuh di dalam layar, dan Batal tidak membuat apa pun`, async ({
      page,
      bukaSebagai,
    }) => {
      await page.setViewportSize(ukuran);
      await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

      // Klik kartunya, BUKAN `radio.check()` (lihat catatan di tes lain).
      await page.getByRole('radiogroup', { name: /jenis survei/i }).locator('label').nth(0).click();

      const dialog = page.getByRole('dialog', { name: /pilih survei skm permenpanrb/i });
      await expect(dialog, 'dialog konfirmasi tak muncul').toBeVisible();
      await expect(dialog).toContainText(/tidak dapat diganti/i);

      // Kotak dialog dan kedua tombolnya seluruhnya berada di dalam layar.
      const kotak = (await dialog.boundingBox())!;
      expect(kotak.x, 'dialog keluar tepi kiri').toBeGreaterThanOrEqual(0);
      expect(kotak.x + kotak.width, 'dialog keluar tepi kanan').toBeLessThanOrEqual(ukuran.width + 1);
      expect(kotak.y + kotak.height, 'dialog keluar tepi bawah').toBeLessThanOrEqual(ukuran.height + 1);
      for (const nama of [/ya, pilih jenis ini/i, /^batal$/i]) {
        const tombol = dialog.getByRole('button', { name: nama });
        await expect(tombol).toBeVisible();
        await expect(tombol).toBeInViewport();
        // Sasaran sentuh yang layak (44px) -- dialog sering dipakai di ponsel.
        // Dipoll: dialog beranimasi zoom-in, dan ukuran di tengah animasi lebih kecil.
        await expect
          .poll(async () => (await tombol.boundingBox())?.height ?? 0, { timeout: 5000 })
          .toBeGreaterThanOrEqual(40);
      }

      // Batal menutup dialog; pemilih tetap tampil tanpa pilihan tersisa.
      await dialog.getByRole('button', { name: /^batal$/i }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('radiogroup', { name: /jenis survei/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /skm permenpanrb/i })).not.toBeChecked();
      await expect(page.getByRole('radio', { name: /survei custom/i })).not.toBeChecked();
    });
  }

  test('Survei Custom: konfirmasi membuka kanvas kosong tanpa kerangka unsur', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

    await pilihCustomLengkap(page);
    await expect(page.getByRole('dialog', { name: /pilih survei custom/i })).toContainText(
      /tanpa nilai ikm/i,
    );
    await page.getByRole('button', { name: /ya, pilih jenis ini/i }).click();

    await expect(page.getByText('Skala Nilai 1-4')).toBeVisible();
    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(0);
  });
});

test.describe('modal Buat Survei — Admin Kabupaten', () => {
  for (const [nama, lebar, tinggi] of [
    ['laptop 1366x768', 1366, 768],
    ['laptop 1280x720', 1280, 720],
    ['ponsel 320x568', 320, 568],
  ] as const) {
    test(`${nama}: footer tetap di layar dan galat validasi terbaca`, async ({
      page,
      bukaSebagai,
    }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await bukaSebagai('kabupaten', '/admin-kab/surveys');
      // Pemicunya baru punya nama yang dapat diakses di layar lebar; ukuran
      // diubah SESUDAH modal terbuka.
      await page
        .getByRole('button', { name: /buat survei/i })
        .first()
        .click();
      await expect(page.getByText('Buat Paket Survei')).toBeVisible();
      await page.setViewportSize({ width: lebar, height: tinggi });

      // Dibatasi ke KARTU modal: pemicu di halaman punya nama yang sama.
      const kartuModal = page
        .getByText('Buat Paket Survei')
        .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
      const footerTombol = kartuModal.getByRole('button', { name: /^buat survei$/i });
      await expect(footerTombol).toBeVisible();
      // Dipoll, bukan diukur sekali: kartu modal beranimasi masuk dan menyesuaikan
      // tingginya sesudah ukuran layar diubah. Yang diuji keadaan AKHIRNYA.
      await expect
        .poll(
          async () => {
            const k = await footerTombol.boundingBox();
            return k ? k.y + k.height : Number.POSITIVE_INFINITY;
          },
          { message: 'tombol Buat Survei di luar layar', timeout: 5000 },
        )
        .toBeLessThanOrEqual(tinggi + 1);

      // Pilihan jenis ada dan terjangkau (boleh digulir ke dalam pandangan).
      const radio = page.getByRole('radio', { name: /skm permenpanrb/i });
      await radio.scrollIntoViewIfNeeded();
      await expect(radio).toBeInViewport();

      // Simpan tanpa mengisi: galat validasi dibuat di sisi klien, tanpa POST.
      await footerTombol.click();
      const galat = page.getByText(/wajib/i).first();
      await galat.scrollIntoViewIfNeeded();
      await expect(galat, 'galat validasi tak terlihat').toBeInViewport();
      await expect
        .poll(
          async () => {
            const g = await galat.boundingBox();
            const f = await footerTombol.boundingBox();
            return g && f ? g.y + g.height - f.y : Number.POSITIVE_INFINITY;
          },
          { message: 'galat validasi tertutup footer', timeout: 5000 },
        )
        .toBeLessThanOrEqual(1);
    });
  }
});

test.describe('builder survei SKM — kartu unsur', () => {
  test('desktop dan ponsel: sembilan kartu terbaca, tanpa tombol hapus unsur dan tanpa luberan', async ({
    page,
    bukaSebagai,
  }) => {
    const skm = (await ambilSurvei()).find((s) => s.jenis === 'skm_permenpanrb');
    test.skip(!skm, 'Tak ada survei SKM di basis data lokal.');

    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('kabupaten', `/admin-kab/surveys/builder/${skm!.id}`);

    const kotak = page.getByPlaceholder(/tulis pertanyaan di sini/i);
    await expect(kotak).toHaveCount(9);
    for (let i = 0; i < 9; i += 1) {
      const lebar = (await kotak.nth(i).boundingBox())!.width;
      expect(lebar, `kotak kalimat unsur ${i + 1} menyempit`).toBeGreaterThanOrEqual(240);
    }
    await expect(page.getByText(/kerangka 9 unsur permenpanrb terkunci/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /hapus 9 unsur baku/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /tambah 9 unsur baku/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /hapus pertanyaan/i })).toHaveCount(0);

    await page.setViewportSize(LEBAR_PONSEL_UMUM);
    const ukuran = await ukurLuberan(page);
    expect(ukuran.luberHalaman, `halaman meluber ${ukuran.luberHalaman}px`).toBe(0);
  });

  test('survei terbit yang sudah dijawab: label skala 1-4 tiap unsur tetap dapat diubah', async ({
    page,
    bukaSebagai,
  }) => {
    const target = (await ambilSurvei()).find(
      (s) => s.jenis === 'skm_permenpanrb' && s.status === 'aktif' && (s.respondentsCount ?? 0) > 0,
    );
    test.skip(!target, 'Tak ada survei SKM aktif yang sudah dijawab.');

    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('kabupaten', `/admin-kab/surveys/builder/${target!.id}`);

    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(9);
    await expect(page.getByRole('button', { name: /ubah label skala 1-4/i })).toHaveCount(9);

    await page
      .getByRole('button', { name: /ubah label skala 1-4/i })
      .first()
      .click();
    await expect(page.getByText(/sudah menerima \d+ jawaban\. skor jawaban lama/i)).toBeVisible();
    await expect(page.getByPlaceholder(/label untuk skor/i)).toHaveCount(4);
  });
});
