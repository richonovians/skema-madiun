import { readFileSync } from 'node:fs';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { BERKAS_TOKEN } from './global-setup';

/**
 * ALUR GANTI JENIS SKM -> CUSTOM DAN PENYARING JENIS, dari UI sampai basis data
 * (8 Oktober 2026).
 *
 * Menjawab permintaan pengguna: "tambah tombol ganti jenis ketika terlanjur memilih
 * jenis survei SKM" dan "tambah filter untuk statistic khusus survei custom dan
 * skm". Membuktikan rantai lengkapnya terhadap peramban dan API sungguhan: modal
 * muat di layar, penggantian menghapus sembilan unsur tetapi mempertahankan
 * pertanyaan tambahan, survei terbit tak menawarkan tombolnya, dan penyaring jenis
 * di Statistik memilah survei custom dari SKM.
 *
 * SPEC INI MENULIS. Ia membuat survei berjudul `[UJI ganti-jenis ...]` (penanda
 * yang dikenali skrip pembersih), mengaktifkan satu, dan mengirim satu jawaban.
 * Survei aktif tak dapat dihapus oleh aplikasi, jadi SESUDAH menjalankannya
 * bersihkan datanya:
 *
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs --dry
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs
 *
 * Butuh akun ber-tiga-peran yang tertaut ke sebuah OPD (opd_id terisi):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/ganti-jenis-alur.spec.ts
 *
 * Tanpa sesi, spec ini DILEWATI -- bukan dinyatakan lulus.
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';

function bacaToken(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(BERKAS_TOKEN, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

const token = bacaToken();

interface PertanyaanApi {
  id: number;
  kodeUnsur: string | null;
  teks: string;
  urutan: number;
}

async function klien(jwt: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: ORIGIN,
    extraHTTPHeaders: { Authorization: `Bearer ${jwt}` },
  });
}

async function masuk(page: Page, peran: 'opd' | 'responden', jwt: string): Promise<void> {
  const context = page.context();
  const domain = new URL(ORIGIN).hostname;
  await context.addCookies([
    { name: 'token', value: jwt, domain, path: '/' },
    { name: 'role', value: peran, domain, path: '/' },
    { name: 'consent', value: '1', domain, path: '/' },
  ]);
  await context.addInitScript(
    ([p, t]) => {
      try {
        localStorage.setItem('token', t);
        localStorage.setItem('role', p);
        localStorage.setItem('consent', '1');
      } catch {
        /* penyimpanan diblokir: kuki saja sudah cukup bagi proxy */
      }
    },
    [peran, jwt],
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('ganti jenis SKM -> Custom dan penyaring jenis', () => {
  test.skip(!token.opd || !token.responden, 'Tak ada sesi: jalankan dengan E2E_IDENTIFIER=<akun uji>.');

  const judul = `[UJI ganti-jenis] ${new Date().toISOString()}`;
  let opd: APIRequestContext;
  let responden: APIRequestContext;
  let skmDrafId = 0;
  let skmAktifId = 0;
  let customJawabId = 0;

  const buat = async (data: Record<string, unknown>): Promise<number> => {
    const res = await opd.post('/api/v1/surveys', { data: { periode: '2026-Q4', ...data } });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()).data.id;
  };
  const tambahPertanyaan = async (id: number, teks: string, tipe = 'teks') => {
    const res = await opd.post(`/api/v1/surveys/${id}/questions`, { data: { teks, tipe } });
    expect(res.status(), await res.text()).toBe(201);
  };
  const aktifkan = async (id: number) => {
    const res = await opd.patch(`/api/v1/surveys/${id}/status`, { data: { status: 'aktif' } });
    expect(res.status(), await res.text()).toBe(200);
  };
  const pertanyaan = async (id: number): Promise<PertanyaanApi[]> => {
    const res = await opd.get(`/api/v1/surveys/${id}/questions`);
    expect(res.status()).toBe(200);
    return (await res.json()).data as PertanyaanApi[];
  };

  test.beforeAll(async () => {
    opd = await klien(token.opd);
    responden = await klien(token.responden);

    skmDrafId = await buat({ judul: `${judul} SKM-draf`, jenis: 'skm_permenpanrb' });
    await tambahPertanyaan(skmDrafId, 'Saran Anda untuk kami?');

    skmAktifId = await buat({ judul: `${judul} SKM-aktif`, jenis: 'skm_permenpanrb' });
    await aktifkan(skmAktifId);

    customJawabId = await buat({
      judul: `${judul} Custom-dijawab`,
      jenis: 'custom',
      tujuan: 'kepuasan',
      metodeNilai: 'rata_rata',
    });
    await tambahPertanyaan(customJawabId, 'Seberapa puas Anda?', 'skala');
    await aktifkan(customJawabId);
    const fill = await responden.get(`/api/v1/surveys/${customJawabId}/fill`);
    expect(fill.status(), await fill.text()).toBe(200);
    const soal = (await fill.json()).data.questions as { id: number }[];
    const kirim = await responden.post(`/api/v1/surveys/${customJawabId}/responses`, {
      data: { answers: soal.map((q) => ({ questionId: q.id, nilai: 4 })) },
    });
    expect(kirim.status(), await kirim.text()).toBe(201);
  });

  test.afterAll(async () => {
    await opd?.dispose();
    await responden?.dispose();
  });

  for (const [nama, ukuran] of [
    ['laptop 1366x768', { width: 1366, height: 768 }],
    ['ponsel 320x568', { width: 320, height: 568 }],
  ] as const) {
    test(`${nama}: modal ganti jenis muat di layar dan Batal tidak mengubah apa pun`, async ({
      page,
    }) => {
      await page.setViewportSize(ukuran);
      await masuk(page, 'opd', token.opd);
      await page.goto(`/admin-opd/surveys/builder/${skmDrafId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(10, {
        timeout: 20_000,
      });

      await page.getByRole('button', { name: /^ganti jenis$/i }).click();
      const dialog = page.getByRole('dialog', { name: /ganti jenis survei/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/sembilan unsur/i);
      await expect(dialog).toContainText('U1');

      // Dialog beranimasi zoom-in: ukurannya dipoll, bukan diukur sekali.
      await expect
        .poll(
          async () => {
            const k = await dialog.boundingBox();
            return k ? k.y + k.height : Number.POSITIVE_INFINITY;
          },
          { message: 'dialog keluar tepi bawah', timeout: 5000 },
        )
        .toBeLessThanOrEqual(ukuran.height + 1);
      const kotak = (await dialog.boundingBox())!;
      expect(kotak.x, 'dialog keluar tepi kiri').toBeGreaterThanOrEqual(0);
      expect(kotak.x + kotak.width, 'dialog keluar tepi kanan').toBeLessThanOrEqual(ukuran.width + 1);

      // Kedua tombol terjangkau (badan menggulir bila isinya tak muat).
      for (const nama of [/ganti ke custom/i, /^batal$/i]) {
        const tombol = dialog.getByRole('button', { name: nama });
        await tombol.scrollIntoViewIfNeeded();
        await expect(tombol).toBeInViewport();
        expect((await tombol.boundingBox())!.height).toBeGreaterThanOrEqual(40);
      }
      await expect(dialog.getByRole('button', { name: /ganti ke custom/i })).toBeDisabled();

      await dialog.getByRole('button', { name: /^batal$/i }).click();
      await expect(dialog).toHaveCount(0);
      expect((await pertanyaan(skmDrafId)).length).toBe(10);
    });
  }

  test('konfirmasi: unsur lenyap, pertanyaan tambahan bertahan, jenis + tujuan + metode tersimpan', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${skmDrafId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(10, {
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /^ganti jenis$/i }).click();
    const dialog = page.getByRole('dialog', { name: /ganti jenis survei/i });
    await dialog.getByLabel(/tujuan survei/i).selectOption('evaluasi');
    await dialog.getByLabel(/metode nilai/i).selectOption('indeks_persen');

    const simpan = page.waitForResponse(
      (r) => /\/api\/v1\/surveys\/\d+\/jenis$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await dialog.getByRole('button', { name: /ganti ke custom/i }).click();
    expect((await simpan).status()).toBe(200);

    // Basis data: jenis custom, unsur lenyap, tambahan tersisa dengan urutan 1.
    const survei = (await (await opd.get(`/api/v1/surveys/${skmDrafId}`)).json()).data;
    expect(survei.jenis).toBe('custom');
    expect(survei.tujuan).toBe('evaluasi');
    expect(survei.metodeNilai).toBe('indeks_persen');
    const sisa = await pertanyaan(skmDrafId);
    expect(sisa).toHaveLength(1);
    expect(sisa[0].kodeUnsur).toBeNull();
    expect(sisa[0].teks).toBe('Saran Anda untuk kami?');
    expect(sisa[0].urutan).toBe(1);

    // UI: kanvas hanya memuat pertanyaan tambahan, panel Nilai Survei terisi, tombol hilang.
    await expect(dialog).toHaveCount(0);
    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(1);
    await expect(page.getByLabel(/tujuan survei/i)).toHaveValue('evaluasi');
    await expect(page.getByLabel(/metode nilai/i)).toHaveValue('indeks_persen');
    await expect(page.getByRole('button', { name: /^ganti jenis$/i })).toHaveCount(0);

    // Muat ulang: keadaannya bertahan, dan tak ada jalan kembali ke SKM.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/metode nilai/i)).toHaveValue('indeks_persen', {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /^ganti jenis$/i })).toHaveCount(0);
  });

  test('survei SKM yang sudah terbit tidak menawarkan tombol, dan API menolak dengan sebab tertulis', async ({
    page,
  }) => {
    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${skmAktifId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(9, {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /^ganti jenis$/i })).toHaveCount(0);

    const res = await opd.patch(`/api/v1/surveys/${skmAktifId}/jenis`, {
      data: { jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toMatch(/berstatus draf/);
    expect((await pertanyaan(skmAktifId)).length).toBe(9);
  });

  test('Statistik: penyaring jenis memilah survei custom dari SKM', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await masuk(page, 'opd', token.opd);
    // `?surveyId=` membuka survei custom yang dijawab, dan menyetel periodenya.
    await page.goto(`/admin-opd/analytics?surveyId=${customJawabId}`, {
      waitUntil: 'domcontentloaded',
    });

    // Bawaan "Semua jenis": Nilai Survei dari backend, bukan Nilai IKM.
    await expect(page.getByText('4,00 / 4').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/jenis survei/i)).toContainText(/semua jenis/i);

    const pilih = async (nama: string) => {
      await page.getByLabel(/jenis survei/i).click();
      await page.getByRole('button', { name: nama, exact: true }).click();
    };

    // SKM: survei custom keluar dari pilihan, jadi nilainya tak lagi tampil.
    await pilih('SKM');
    await expect(page.getByText('4,00 / 4')).toHaveCount(0);

    // Custom: kembali, dan bagian khas SKM (tabel 9 unsur) tak ada.
    await pilih('Custom');
    await expect(page.getByText('4,00 / 4').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/analisis 9 unsur/i)).toHaveCount(0);
  });
});
