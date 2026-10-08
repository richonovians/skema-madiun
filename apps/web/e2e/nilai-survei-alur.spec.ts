import { readFileSync } from 'node:fs';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { BERKAS_TOKEN } from './global-setup';

/**
 * ALUR NILAI SURVEI survei custom, dari UI sampai basis data (8 Oktober 2026).
 *
 * Survei custom memilih TUJUAN dan METODE NILAI saat dibuat; hasilnya tampil
 * sebagai "Nilai Survei" / "Indeks ..." beserta kategori, bukan lagi rata-rata
 * polos. Spec ini membuktikan rantai lengkapnya terhadap peramban dan API
 * sungguhan: angka tampil di kartu survei, mengganti metode di builder mengubah
 * tampilan TANPA menyentuh jawaban, dan survei SKM tidak memakai pengaturan ini.
 *
 * SPEC INI MENULIS. Ia membuat survei berjudul `[UJI nilai-survei ...]`
 * (penanda yang dikenali skrip pembersih), mengaktifkannya, dan mengirim satu
 * jawaban. Survei aktif tak dapat dihapus oleh aplikasi, jadi SESUDAH
 * menjalankannya bersihkan datanya:
 *
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs --dry
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs
 *
 * Butuh akun ber-tiga-peran yang tertaut ke sebuah OPD (opd_id terisi):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/nilai-survei-alur.spec.ts
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
  options?: { label: string; nilai: number | null }[];
}
interface NilaiSurveiApi {
  judul: string;
  nilai: number;
  tampilan: string;
  kategori: string;
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

test.describe('Nilai Survei survei custom', () => {
  test.skip(!token.opd || !token.responden, 'Tak ada sesi: jalankan dengan E2E_IDENTIFIER=<akun uji>.');

  const judul = `[UJI nilai-survei] ${new Date().toISOString()}`;
  let surveiId = 0;
  let opd: APIRequestContext;
  let responden: APIRequestContext;

  const bacaSurvei = async (): Promise<{
    tujuan: string | null;
    metodeNilai: string | null;
    nilaiSurvei: NilaiSurveiApi | null;
  }> => {
    const res = await opd.get(`/api/v1/surveys/${surveiId}`);
    expect(res.status()).toBe(200);
    return (await res.json()).data;
  };

  test.beforeAll(async () => {
    opd = await klien(token.opd);
    responden = await klien(token.responden);

    const buat = await opd.post('/api/v1/surveys', {
      data: {
        judul,
        periode: '2026-Q4',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'indeks_persen',
      },
    });
    expect(buat.status(), await buat.text()).toBe(201);
    surveiId = (await buat.json()).data.id;

    const pertanyaan = await opd.post(`/api/v1/surveys/${surveiId}/questions`, {
      data: { teks: 'Seberapa puas Anda dengan layanan kami?', tipe: 'skala' },
    });
    expect(pertanyaan.status(), await pertanyaan.text()).toBe(201);
  });

  test.afterAll(async () => {
    await opd?.dispose();
    await responden?.dispose();
  });

  test('survei baru tanpa jawaban: nilaiSurvei null, kartu menampilkan "-", bukan nol', async ({
    page,
  }) => {
    expect((await bacaSurvei()).nilaiSurvei).toBeNull();

    const aktif = await opd.patch(`/api/v1/surveys/${surveiId}/status`, {
      data: { status: 'aktif' },
    });
    expect(aktif.status(), await aktif.text()).toBe(200);

    await masuk(page, 'opd', token.opd);
    await page.goto('/admin-opd/surveys', { waitUntil: 'domcontentloaded' });
    const kartu = page.locator('div', { hasText: judul }).last();
    await expect(page.getByRole('heading', { name: judul })).toBeVisible({ timeout: 20_000 });
    await expect(kartu.getByText('Nilai Survei').first()).toBeVisible();
    await expect(page.getByText(/\b0 · /)).toHaveCount(0);
  });

  test('sesudah dijawab skala 4: kartu menampilkan Indeks Kepuasan 100% · Sangat Puas', async ({
    page,
  }) => {
    const fill = await responden.get(`/api/v1/surveys/${surveiId}/fill`);
    expect(fill.status(), await fill.text()).toBe(200);
    const pertanyaan = (await fill.json()).data.questions as PertanyaanApi[];
    const kirim = await responden.post(`/api/v1/surveys/${surveiId}/responses`, {
      data: { answers: pertanyaan.map((q) => ({ questionId: q.id, nilai: 4 })) },
    });
    expect(kirim.status(), await kirim.text()).toBe(201);

    const survei = await bacaSurvei();
    expect(survei.nilaiSurvei).toEqual({
      judul: 'Indeks Kepuasan',
      nilai: 100,
      tampilan: '100%',
      kategori: 'Sangat Puas',
    });

    await masuk(page, 'opd', token.opd);
    await page.goto('/admin-opd/surveys', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: judul })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Indeks Kepuasan').first()).toBeVisible();
    await expect(page.getByText('100% · Sangat Puas').first()).toBeVisible();
    // Bukan lagi "Nilai Sementara IKM" untuk survei custom.
    const kartu = page.locator('div.relative', { has: page.getByRole('heading', { name: judul }) });
    await expect(kartu.getByText('Nilai Sementara IKM')).toHaveCount(0);
  });

  test('builder: panel Nilai Survei terisi, mengganti metode menyimpan dan mengubah tampilan', async ({
    page,
  }) => {
    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${surveiId}`, { waitUntil: 'domcontentloaded' });

    const tujuan = page.getByLabel(/tujuan survei/i);
    const metode = page.getByLabel(/metode nilai/i);
    await expect(tujuan).toHaveValue('kepuasan', { timeout: 20_000 });
    await expect(metode).toHaveValue('indeks_persen');
    // Survei sudah menerima jawaban: pengaturan ini tetap dapat diubah (hanya tampilan).
    await expect(metode).toBeEnabled();

    const simpan = page.waitForResponse(
      (r) => /\/api\/v1\/surveys\/\d+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await metode.selectOption('rata_rata');
    expect((await simpan).status()).toBe(200);

    // Tersimpan di basis data, dan jawaban lama utuh (rata-rata 4,00 tak berubah).
    const sesudah = await bacaSurvei();
    expect(sesudah.metodeNilai).toBe('rata_rata');
    expect(sesudah.tujuan).toBe('kepuasan');
    expect(sesudah.nilaiSurvei).toEqual({
      judul: 'Nilai Survei',
      nilai: 4,
      tampilan: '4,00 / 4',
      kategori: 'Sangat Puas',
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/metode nilai/i)).toHaveValue('rata_rata', { timeout: 20_000 });

    await page.goto('/admin-opd/surveys', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: judul })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('4,00 / 4 · Sangat Puas').first()).toBeVisible();
  });

  test('ekspor CSV survei custom memuat Nilai Survei dan kategori, bukan Nilai IKM', async () => {
    const res = await opd.get(`/api/v1/surveys/${surveiId}/results/export`, {
      params: { format: 'csv' },
    });
    expect(res.status()).toBe(200);
    const csv = await res.text();
    expect(csv).toContain('Laporan Hasil Survei');
    expect(csv).toContain('Nilai Survei,"4,00 / 4"');
    expect(csv).toContain('Kategori,Sangat Puas');
    expect(csv).not.toContain('Nilai IKM');
  });

  test('survei SKM tidak memakai tujuan dan metode: API menolak, builder tanpa panelnya', async ({
    page,
  }) => {
    const salah = await opd.post('/api/v1/surveys', {
      data: {
        judul: `${judul} SKM-salah`,
        periode: '2026-Q4',
        jenis: 'skm_permenpanrb',
        tujuan: 'kepuasan',
      },
    });
    expect(salah.status()).toBe(400);

    const skm = await opd.post('/api/v1/surveys', {
      data: { judul: `${judul} SKM`, periode: '2026-Q4', jenis: 'skm_permenpanrb' },
    });
    expect(skm.status(), await skm.text()).toBe(201);
    const skmId = (await skm.json()).data.id;

    const ubah = await opd.patch(`/api/v1/surveys/${skmId}`, { data: { metodeNilai: 'rata_rata' } });
    expect(ubah.status()).toBe(400);

    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${skmId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/tulis pertanyaan di sini/i)).toHaveCount(9, {
      timeout: 20_000,
    });
    await expect(page.getByLabel(/tujuan survei/i)).toHaveCount(0);
    await expect(page.getByLabel(/metode nilai/i)).toHaveCount(0);
  });

  test('membuat survei custom lewat UI builder: tujuan dan metode pilihan terbawa ke basis data', async ({
    page,
  }) => {
    await masuk(page, 'opd', token.opd);
    await page.goto('/admin-opd/surveys/builder/new', { waitUntil: 'domcontentloaded' });

    await page.getByRole('radiogroup', { name: /jenis survei/i }).locator('label').nth(1).click();
    await page.getByRole('radio', { name: 'Penilaian', exact: true }).check();
    await page.getByRole('radio', { name: 'Indeks persen', exact: true }).check();
    await page.getByRole('button', { name: /^lanjutkan$/i }).click();
    await page.getByRole('button', { name: /ya, pilih jenis ini/i }).click();

    // Survei custom dibuat MALAS pada aksi pertama (menambah pertanyaan skala).
    const dibuat = page.waitForResponse(
      (r) => /\/api\/v1\/surveys$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByText('Skala Nilai 1-4').click();
    const respons = await dibuat;
    expect(respons.status()).toBe(201);
    const badan = (await respons.json()).data;
    expect(badan.jenis).toBe('custom');
    expect(badan.tujuan).toBe('penilaian');
    expect(badan.metodeNilai).toBe('indeks_persen');

    // Judul disetel agar skrip pembersih mengenali barisnya.
    const judulUji = page.getByRole('textbox', { name: /judul survei/i });
    await judulUji.fill(`${judul} dari UI`);
    const simpanJudul = page.waitForResponse(
      (r) => /\/api\/v1\/surveys\/\d+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await judulUji.blur();
    expect((await simpanJudul).status()).toBe(200);
  });
});
