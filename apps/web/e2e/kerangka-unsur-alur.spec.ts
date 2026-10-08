import { readFileSync } from 'node:fs';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { BERKAS_TOKEN } from './global-setup';

/**
 * ALUR KERANGKA 9 UNSUR DAN LABEL SKALA, dari UI sampai basis data (8 Oktober 2026).
 *
 * Menjawab dua laporan pengguna:
 *  - "label teks jawaban yang skala 1-4 masih belum bisa diubah": label tak
 *    dapat diubah begitu survei menerima jawaban pertama, dan tombolnya ikut
 *    lenyap. Kini boleh sampai survei ditutup, sebab jawaban skala menyimpan
 *    skor, bukan penunjuk ke baris opsi;
 *  - kalimat pertanyaan tiap unsur SKM dapat disunting OPD, sementara unsurnya
 *    tidak dapat dihapus.
 *
 * SPEC INI MENULIS. Ia membuat satu survei berjudul `[UJI kerangka-unsur ...]`
 * (penanda yang dikenali skrip pembersih), mengaktifkannya, dan mengirim satu
 * jawaban. Survei aktif tak dapat dihapus oleh aplikasi, jadi SESUDAH
 * menjalankannya bersihkan datanya:
 *
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs --dry
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs
 *
 * Butuh akun ber-tiga-peran yang tertaut ke sebuah OPD (opd_id terisi):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/kerangka-unsur-alur.spec.ts
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

interface Opsi {
  label: string;
  nilai: number | null;
}
interface PertanyaanApi {
  id: number;
  kodeUnsur: string | null;
  teks: string;
  tipe: string;
  options?: Opsi[];
}

async function klien(jwt: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: ORIGIN,
    extraHTTPHeaders: { Authorization: `Bearer ${jwt}` },
  });
}

async function masuk(page: Page, peran: 'opd' | 'responden', jwt: string): Promise<void> {
  const context = page.context();
  await context.addCookies([
    { name: 'token', value: jwt, domain: new URL(ORIGIN).hostname, path: '/' },
    { name: 'role', value: peran, domain: new URL(ORIGIN).hostname, path: '/' },
    { name: 'consent', value: '1', domain: new URL(ORIGIN).hostname, path: '/' },
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

test.describe('kerangka unsur SKM dan label skala', () => {
  test.skip(!token.opd || !token.responden, 'Tak ada sesi: jalankan dengan E2E_IDENTIFIER=<akun uji>.');

  let surveiId = 0;
  let opd: APIRequestContext;
  let responden: APIRequestContext;

  const tombolLabel = (page: Page) => page.getByRole('button', { name: /ubah label skala 1-4/i });
  const kotakKalimat = (page: Page) => page.getByPlaceholder(/tulis pertanyaan di sini/i);

  const daftarPertanyaan = async (): Promise<PertanyaanApi[]> => {
    const res = await opd.get(`/api/v1/surveys/${surveiId}/questions`);
    expect(res.status()).toBe(200);
    return (await res.json()).data as PertanyaanApi[];
  };

  test.beforeAll(async () => {
    opd = await klien(token.opd);
    responden = await klien(token.responden);
    const res = await opd.post('/api/v1/surveys', {
      data: {
        judul: `[UJI kerangka-unsur] ${new Date().toISOString()}`,
        periode: '2026-Q4',
        jenis: 'skm_permenpanrb',
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    surveiId = (await res.json()).data.id;
  });

  test.afterAll(async () => {
    await opd?.dispose();
    await responden?.dispose();
  });

  test('draf: survei SKM lahir dengan 9 unsur terkunci yang kalimatnya dapat diubah', async ({
    page,
  }) => {
    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${surveiId}`, { waitUntil: 'domcontentloaded' });

    await expect(kotakKalimat(page)).toHaveCount(9);
    await expect(page.getByText('U1 · Persyaratan')).toBeVisible();
    await expect(page.getByText(/kerangka 9 unsur permenpanrb terkunci/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /hapus (9 unsur baku|pertanyaan)/i })).toHaveCount(0);

    const kalimat = 'Seberapa mudah persyaratan layanan kami?';
    const simpan = page.waitForResponse(
      (r) => r.url().includes('/api/v1/questions/') && r.request().method() === 'PATCH',
    );
    await kotakKalimat(page).first().fill(kalimat);
    await kotakKalimat(page).first().blur();
    expect((await simpan).status()).toBe(200);

    // Badge tetap menyebut NAMA RESMI unsur, dan kalimat tersimpan di basis data.
    await expect(page.getByText('U1 · Persyaratan')).toBeVisible();
    const u1 = (await daftarPertanyaan()).find((q) => q.kodeUnsur === 'U1')!;
    expect(u1.teks).toBe(kalimat);
  });

  test('draf: label skala 1-4 dapat diubah, tersimpan, dan bertahan sesudah muat ulang', async ({
    page,
  }) => {
    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${surveiId}`, { waitUntil: 'domcontentloaded' });
    await expect(kotakKalimat(page)).toHaveCount(9);

    await tombolLabel(page).first().click();
    const kolom = page.getByPlaceholder(/label untuk skor/i);
    await expect(kolom).toHaveCount(4);
    const labelDraf = ['Sangat Tidak Puas', 'Tidak Puas', 'Puas', 'Sangat Puas'];
    for (const [i, label] of labelDraf.entries()) await kolom.nth(i).fill(label);

    const simpan = page.waitForResponse(
      (r) => r.url().includes('/api/v1/questions/') && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
    expect((await simpan).status()).toBe(200);
    await expect(page.getByText('Sangat Tidak Puas').first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(kotakKalimat(page)).toHaveCount(9);
    await expect(page.getByText('Sangat Tidak Puas').first()).toBeVisible();

    const u1 = (await daftarPertanyaan()).find((q) => q.kodeUnsur === 'U1')!;
    expect(u1.options?.map((o) => o.label)).toEqual(labelDraf);
    expect(u1.options?.map((o) => o.nilai)).toEqual([1, 2, 3, 4]);
  });

  test('sesudah terbit dan dijawab: label skala tetap dapat diubah dan tampil ke responden', async ({
    page,
  }) => {
    const aktif = await opd.patch(`/api/v1/surveys/${surveiId}/status`, {
      data: { status: 'aktif' },
    });
    expect(aktif.status(), await aktif.text()).toBe(200);

    // Satu responden mengisi: seluruh pertanyaan skala bernilai 4.
    const fill = await responden.get(`/api/v1/surveys/${surveiId}/fill`);
    expect(fill.status(), await fill.text()).toBe(200);
    const pertanyaan = (await fill.json()).data.questions as PertanyaanApi[];
    const kirim = await responden.post(`/api/v1/surveys/${surveiId}/responses`, {
      data: { answers: pertanyaan.map((q) => ({ questionId: q.id, nilai: 4 })) },
    });
    expect(kirim.status(), await kirim.text()).toBe(201);

    await masuk(page, 'opd', token.opd);
    await page.goto(`/admin-opd/surveys/builder/${surveiId}`, { waitUntil: 'domcontentloaded' });
    await expect(kotakKalimat(page)).toHaveCount(9);
    // Susunan terkunci karena sudah ada jawaban, tetapi label skala tidak.
    await expect(page.getByText(/sudah menerima 1 jawaban/i).first()).toBeVisible();
    await expect(tombolLabel(page)).toHaveCount(9);

    await tombolLabel(page).first().click();
    await expect(page.getByText(/skor jawaban lama tidak berubah/i)).toBeVisible();
    const kolom = page.getByPlaceholder(/label untuk skor/i);
    const labelBaru = ['Label Baru 1', 'Label Baru 2', 'Label Baru 3', 'Label Baru 4'];
    for (const [i, label] of labelBaru.entries()) await kolom.nth(i).fill(label);

    const simpan = page.waitForResponse(
      (r) => r.url().includes('/api/v1/questions/') && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
    expect((await simpan).status()).toBe(200);
    await expect(page.getByText('Label Baru 4').first()).toBeVisible();

    // Responden melihat label baru; jawaban lama (skor 4) utuh.
    const fillBaru = await responden.get(`/api/v1/surveys/${surveiId}/fill`);
    const u1 = ((await fillBaru.json()).data.questions as PertanyaanApi[]).find(
      (q) => q.kodeUnsur === 'U1',
    )!;
    expect(u1.options?.map((o) => o.label)).toEqual(labelBaru);

    const hasil = await opd.get(`/api/v1/surveys/${surveiId}/results`);
    expect(hasil.status()).toBe(200);
    const data = (await hasil.json()).data;
    expect(data.jumlahResponden).toBe(1);
    expect(data.nilaiIkm).toBe(100);
  });

  test('unsur tetap tidak dapat dihapus lewat API walau survei sudah terbit', async () => {
    const u1 = (await daftarPertanyaan()).find((q) => q.kodeUnsur === 'U1')!;
    const hapus = await opd.delete(`/api/v1/questions/${u1.id}`);
    expect(hapus.status()).toBe(400);
    expect((await daftarPertanyaan()).filter((q) => q.kodeUnsur)).toHaveLength(9);
  });
});
