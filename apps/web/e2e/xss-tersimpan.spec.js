import { test, expect } from '@playwright/test';
import { AKUN, BASE_URL, masukApi, musnahkanSurveiUji, panggilApi } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * QA-SECURITY-UAT #4: XSS tersimpan.
 *
 * Teks yang diketik satu pengguna dan ditayangkan kepada pengguna LAIN dikirim
 * berisi muatan HTML, lalu setiap halaman yang menayangkannya dibuka di Chrome
 * sungguhan. Penyisipnya warga (judul, uraian, dan balasan pengaduan) dan Admin
 * OPD (judul survei, teks pertanyaan, label opsi); penontonnya Admin OPD, Admin
 * Kabupaten, dan warga.
 *
 * Pemeriksaan statis 28 Oktober 2026 tak menemukan satu pun sink HTML mentah
 * di `apps/web/src` (satu-satunya `dangerouslySetInnerHTML` berisi `<style>`
 * statis) dan tak ada `href` yang dibangun dari teks pengguna. Berkas ini
 * mengunci hasil itu dari arah yang tak dapat dibantah pemeriksaan statis:
 * markdown, pustaka pihak ketiga, atau `dangerouslySetInnerHTML` yang kelak
 * ditambahkan akan memerahkannya.
 *
 * Tiap halaman diperiksa tiga hal:
 *  1. perangkap `window.__xss` tak pernah disetel (muatan tak pernah jalan);
 *  2. tak ada `<img src="x">` di DOM (muatan tak menjadi elemen);
 *  3. KENDALI: muatannya TERLIHAT sebagai teks harfiah. Tanpa ini, halaman yang
 *     gagal memuat datanya akan lulus dengan sendirinya.
 *
 * MENULIS ke `skm_db` lewat server dev: satu pengaduan berbalasan dan satu
 * survei, keduanya berpenanda `[UJI `. Survei dimusnahkan di `afterAll`;
 * pengaduan ditinggalkan untuk `bersihkan-data-uji.mjs`, seperti
 * `ajukan-pengaduan.spec.js`.
 */

const muatan = (label) => `<img src=x onerror="window.__xss='${label}'">`;

const DATA = {
  judulAduan: `[UJI XSS] ${muatan('judul-aduan')}`,
  uraian: `<script>window.__xss='uraian-script'</script>${muatan('uraian')}`,
  balasan: muatan('balasan'),
  judulSurvei: `[UJI XSS] ${muatan('judul-survei')}`,
  pertanyaan: `Pertanyaan ${muatan('pertanyaan')}`,
  opsi: [muatan('opsi-1'), 'Opsi biasa'],
};

/** Potongan unik tiap muatan, dicari sebagai teks harfiah di halaman. */
const jejak = (label) => `window.__xss='${label}'`;

let aduan;
let surveiId;

// Empat sampai lima halaman per uji, termasuk rute detail yang di server dev
// baru dikompilasi saat pertama dibuka: 30 detik bawaan habis di halaman
// keempat Admin Kabupaten pada jalan pertama.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

test.beforeAll(async () => {
  const opd = await masukApi(AKUN.adminOpd, 'opd');
  const warga = await masukApi(AKUN.warga);

  const form = new FormData();
  form.set('opdId', String(opd.user.opdId));
  form.set('kategori', 'aduan');
  form.set('judul', DATA.judulAduan);
  form.set('uraian', DATA.uraian);
  const res = await fetch(`${BASE_URL}/api/v1/complaints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${warga.token}` },
    body: form,
  });
  expect(res.status, await res.clone().text()).toBe(201);
  aduan = (await res.json()).data;

  const balas = new FormData();
  balas.set('pesan', DATA.balasan);
  const resBalas = await fetch(`${BASE_URL}/api/v1/complaints/${aduan.id}/replies`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${warga.token}` },
    body: balas,
  });
  expect(resBalas.status, await resBalas.clone().text()).toBe(201);

  const survei = await panggilApi(opd.token, 'POST', '/surveys', {
    judul: DATA.judulSurvei,
    periode: '2026-Q4',
    jenis: 'custom',
    tujuan: 'kepuasan',
    metodeNilai: 'rata_rata',
    allowMultipleSubmit: true,
  });
  surveiId = survei.id;
  await panggilApi(opd.token, 'POST', `/surveys/${surveiId}/questions`, {
    teks: DATA.pertanyaan,
    tipe: 'pilihan',
    isIkmUnsur: false,
    options: DATA.opsi.map((label) => ({ label })),
  });
  await panggilApi(opd.token, 'PATCH', `/surveys/${surveiId}/status`, { status: 'aktif' });
});

test.afterAll(async () => {
  if (surveiId) await musnahkanSurveiUji(surveiId);
});

/** Perangkap dipasang sebelum skrip halaman mana pun jalan. */
async function pasangPerangkap(page) {
  await page.addInitScript(() => {
    window.__xssTertangkap = [];
    Object.defineProperty(window, '__xss', {
      configurable: false,
      get: () => undefined,
      set: (nilai) => window.__xssTertangkap.push(String(nilai)),
    });
  });
}

async function periksaHalaman(page, jalur, labelTerlihat, sesudahBuka) {
  await page.goto(jalur);
  if (sesudahBuka) await sesudahBuka(page);
  // Tunggu datanya tiba dalam BENTUK APA PUN -- teks harfiah atau elemen --
  // supaya halaman yang menjalankan muatan memerah di perangkap, bukan di
  // kendali teks yang memang tak akan pernah muncul.
  for (const label of labelTerlihat) {
    await expect(
      page.getByText(jejak(label), { exact: false }).or(page.locator('img[src="x"]')).first(),
      `${jalur}: data "${label}" tak pernah tiba di halaman`,
    ).toBeAttached();
  }
  // Beri kesempatan pada `onerror` yang tertunda; gambar `x` gagal hampir seketika.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__xssTertangkap), `${jalur}: muatan dijalankan`).toEqual([]);
  expect(await page.locator('img[src="x"]').count(), `${jalur}: muatan menjadi elemen`).toBe(0);
  for (const label of labelTerlihat) {
    await expect(
      page.getByText(jejak(label), { exact: false }).first(),
      `${jalur}: muatan "${label}" harus TERLIHAT sebagai teks (kendali)`,
    ).toBeVisible();
  }
}

test('warga: daftar dan detail pengaduan, daftar dan isian survei', async ({ page }) => {
  await pasangPerangkap(page);
  await masukSebagai(page, AKUN.warga, '/dashboard');
  await periksaHalaman(page, '/complaints', ['judul-aduan']);
  await periksaHalaman(page, `/complaints/${aduan.ticketNo}`, ['judul-aduan', 'uraian', 'balasan']);
  await periksaHalaman(page, '/surveys', ['judul-survei']);
  // Halaman isian dibuka dengan layar persetujuan; pertanyaan dan opsinya baru
  // tampil sesudah "Mulai Isi Survei".
  await periksaHalaman(page, `/surveys/${surveiId}`, ['pertanyaan', 'opsi-1'], (p) =>
    p.getByRole('button', { name: 'Mulai Isi Survei' }).click(),
  );
});

test('Admin OPD: daftar dan detail pengaduan, daftar dan rincian survei', async ({ page }) => {
  await pasangPerangkap(page);
  await masukSebagai(page, AKUN.adminOpd, '/admin-opd/dashboard');
  await periksaHalaman(page, '/admin-opd/complaints', ['judul-aduan']);
  await periksaHalaman(page, `/admin-opd/complaints/${aduan.ticketNo}`, [
    'judul-aduan',
    'uraian',
    'balasan',
  ]);
  await periksaHalaman(page, '/admin-opd/surveys', ['judul-survei']);
  await periksaHalaman(page, `/admin-opd/surveys/${surveiId}`, ['judul-survei']);
});

test('Admin Kabupaten: daftar dan detail pengaduan, monitoring survei', async ({ page }) => {
  await pasangPerangkap(page);
  await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
  await periksaHalaman(page, '/admin-kab/complaints', ['judul-aduan']);
  await periksaHalaman(page, `/admin-kab/complaints/${aduan.ticketNo}`, [
    'judul-aduan',
    'uraian',
    'balasan',
  ]);
  await periksaHalaman(page, '/admin-kab/surveys', ['judul-survei']);
  await periksaHalaman(page, `/admin-kab/surveys/${surveiId}`, ['judul-survei']);
});
