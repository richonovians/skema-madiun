import { test, expect } from '@playwright/test';
import { AKUN, BASE_URL, masukApi } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * TC-FE-010 — E2E: Pengajuan Pengaduan dari Login sampai Tiket Terbit.
 *
 * Jalur warga kedua setelah pengisian survei, dan satu-satunya yang menghasilkan
 * nomor tiket yang dipegang warga sebagai bukti. Kegagalan di sini berarti
 * laporan masyarakat tak pernah sampai ke OPD.
 *
 * Kerusakan yang ditangkap berkas ini:
 *  - `opdId` tak ikut terkirim atau terkirim sebagai nama, bukan id → pengaduan
 *    mendarat di OPD yang salah, atau ditolak backend;
 *  - halaman sukses menampilkan nomor tiket bawaan `COM-2026-00000` karena
 *    `result.id` tak diteruskan — warga memegang nomor yang tak pernah ada;
 *  - centang "kirim sebagai anonim" tak sampai ke basis data → identitas warga
 *    tersimpan padahal ia diberi janji sebaliknya;
 *  - pengaduan tampak terkirim di layar tetapi tak pernah tersimpan.
 *
 * ── Penyesuaian 15 September 2026 ─────────────────────────────────────────
 * Taksonomi sub-kategori DIHAPUS dari produk (4 September 2026): endpoint
 * `/ref/complaint-sub-categories` tak ada lagi, dan kategorinya menyusut
 * menjadi tiga yang umum (`aduan`, `lapor`, `lainnya`). Dua hal di berkas ini
 * ikut berubah karenanya:
 *  - seluruh langkah sub-kategori dibuang — menguji dropdown yang tak pernah
 *    dirender hanya menghasilkan merah yang tak berarti;
 *  - uji "mengganti kategori membuang sub-kategori" DIGANTI seluruhnya oleh uji
 *    pengiriman anonim. Penggantinya bukan tambal-sulam: yang hilang adalah
 *    aturan turunan antar-dropdown, dan yang paling pantas menggantikannya
 *    adalah janji yang paling mahal bila diingkari — anonimitas pelapor.
 */

const API = `${BASE_URL}/api/v1`;

/** Kategori HARFIAH, bukan dibaca balik dari API — kalau dibaca balik,
 *  pengujiannya membandingkan jawaban dengan dirinya sendiri. */
const KATEGORI = { kode: 'aduan', label: 'Aduan' };

/** Dropdown kustom: klik pemicunya (`button#<id>`), lalu pilihan di panelnya. */
async function pilihDropdown(page, id, label) {
  await page.locator(`#${id}`).click();
  const opsi = page.locator(`#${id}`).locator('..').getByRole('button', { name: label, exact: true });
  await opsi.waitFor({ state: 'visible', timeout: 10000 });
  await opsi.click();
}

async function ambilPengaduan(token, ticketNo) {
  const res = await fetch(`${API}/complaints?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return (json.data ?? []).find((c) => c.ticketNo === ticketNo) ?? null;
}

test.describe('Pengajuan pengaduan oleh warga', () => {
  test('warga mengirim pengaduan dan menerima nomor tiket yang benar-benar tersimpan', async ({
    page,
  }) => {
    // Penanda unik: satu-satunya cara mengenali kembali pengaduan milik jalan
    // pengujian ini di antara pengaduan lain di basis data pengembangan.
    const cap = Date.now();
    const judul = `[UJI E2E] Jalan berlubang ${cap}`;
    const uraian =
      'Terdapat lubang selebar satu meter di depan balai desa. Sudah dua pekan dan belum ditangani.';

    await masukSebagai(page, AKUN.warga, '/dashboard');

    // Nama OPD tujuan dibaca dari API, bukan ditebak: daftar OPD datang dari
    // sinkronisasi Helpdesk dan isinya berbeda antar-lingkungan.
    const sesi = await masukApi(AKUN.warga);
    const opdRes = await fetch(`${API}/opd?limit=100&isActive=true`, {
      headers: { Authorization: `Bearer ${sesi.token}` },
    });
    const opdList = (await opdRes.json()).data ?? [];
    expect(opdList.length, 'Tak ada OPD aktif — pengaduan mustahil dikirim').toBeGreaterThan(0);
    const opd = opdList[0];

    await page.goto('/complaints/new');
    await expect(
      page.getByRole('heading', { name: 'Sampaikan Keluhan & Pengaduan Anda' }),
    ).toBeVisible();

    await pilihDropdown(page, 'department', opd.nama);
    await pilihDropdown(page, 'category', KATEGORI.label);

    // Tak ada lagi dropdown sub-kategori sesudah kategori dipilih. Diperiksa
    // di sini supaya sisa taksonomi lama yang kembali diam-diam ketahuan dari
    // jalur yang benar-benar dipakai warga, bukan hanya dari uji komponen.
    await expect(page.locator('#subCategory')).toHaveCount(0);

    await page.getByLabel('Judul Laporan').fill(judul);
    await page.getByLabel('Uraian Detail Kejadian').fill(uraian);

    await page.getByRole('button', { name: 'Kirim Laporan' }).click();

    // --- Halaman sukses ---
    await page.waitForURL('**/complaints/success**', { timeout: 30000 });
    const tiket = new URL(page.url()).searchParams.get('complaintId');

    // Nomor tiket backend berformat PGD + YYYYMMDD + 4 karakter (TC-CMP-002).
    // `COM-2026-00000` adalah nilai BAWAAN halaman sukses saat parameternya
    // hilang — kalau itu yang muncul, warga memegang nomor yang tak pernah ada.
    expect(tiket, 'Nomor tiket tidak diteruskan ke halaman sukses').toMatch(/^PGD\d{8}[A-Z0-9]{4}$/);
    await expect(page.getByText(tiket, { exact: true })).toBeVisible();
    await expect(page.getByText(opd.nama, { exact: true }).first()).toBeVisible();

    // --- Yang menentukan bukan layarnya, melainkan yang tersimpan ---
    const tersimpan = await ambilPengaduan(sesi.token, tiket);
    expect(tersimpan, `Pengaduan bertiket ${tiket} tidak ditemukan di backend`).not.toBeNull();
    expect(tersimpan.judul).toBe(judul);
    // Backend menamainya `uraian`; formulir mengirimnya sebagai `description`
    // dan `complaints.api.js` yang menerjemahkan. Memeriksa nama backend-nya
    // memastikan terjemahan itu benar-benar terjadi.
    expect(tersimpan.uraian).toBe(uraian);
    expect(tersimpan.kategori).toBe(KATEGORI.kode);
    // `opdId` harus id numeriknya, bukan namanya — pengaduan yang salah OPD
    // tak pernah sampai ke petugas yang berwenang menanganinya.
    expect(String(tersimpan.opdId)).toBe(String(opd.id));
    // Pengaduan biasa TETAP membawa identitas; tanpa pasangan ini, uji anonim
    // di bawah akan tetap hijau seandainya seluruh pengaduan jadi anonim.
    expect(tersimpan.isAnonim).toBe(false);
  });

  test('centang anonim benar-benar sampai ke basis data, bukan berhenti di layar', async ({
    page,
  }) => {
    // Janji anonimitas hanya berarti bila ia bertahan sampai baris tersimpan.
    // Centang yang hilang di tengah jalan adalah kerusakan yang tak terlihat
    // sama sekali dari sisi warga: layarnya tetap mengaku berhasil, sementara
    // identitasnya ikut tercatat.
    const judul = `[UJI E2E] Laporan anonim ${Date.now()}`;

    await masukSebagai(page, AKUN.warga, '/dashboard');
    const sesi = await masukApi(AKUN.warga);

    await page.goto('/complaints/new');
    await pilihDropdown(page, 'category', KATEGORI.label);
    await page.getByLabel('Judul Laporan').fill(judul);
    await page
      .getByLabel('Uraian Detail Kejadian')
      .fill('Dikirim tanpa identitas untuk menguji janji anonimitas.');
    await page.locator('#isAnonim').check();

    await page.getByRole('button', { name: 'Kirim Laporan' }).click();
    await page.waitForURL('**/complaints/success**', { timeout: 30000 });
    const tiket = new URL(page.url()).searchParams.get('complaintId');
    expect(tiket).toMatch(/^PGD\d{8}[A-Z0-9]{4}$/);

    const tersimpan = await ambilPengaduan(sesi.token, tiket);
    expect(tersimpan, `Pengaduan bertiket ${tiket} tidak ditemukan di backend`).not.toBeNull();
    expect(tersimpan.isAnonim).toBe(true);
    // `userId` DIHILANGKAN seluruhnya pada pengaduan anonim, bukan dikosongkan
    // (ComplaintEntity menyebutnya terus terang: nilai apa pun yang tetap
    // dikirim membuka celah bagi kode klien yang membacanya tanpa memeriksa
    // `isAnonim`). Karena itu yang diperiksa ketiadaan medannya, bukan nilainya.
    expect(tersimpan.userId).toBeUndefined();
  });

  test('pengaduan yang gagal terkirim tidak menghapus isian warga', async ({ page }) => {
    // Warga sudah mengetik uraian panjang; kegagalan jaringan tak boleh
    // memaksanya mengetik ulang seluruhnya.
    await masukSebagai(page, AKUN.warga, '/dashboard');
    await page.goto('/complaints/new');

    const sesi = await masukApi(AKUN.warga);
    const opdRes = await fetch(`${API}/opd?limit=100&isActive=true`, {
      headers: { Authorization: `Bearer ${sesi.token}` },
    });
    const opd = ((await opdRes.json()).data ?? [])[0];

    const uraian = 'Uraian panjang yang sayang sekali kalau hilang gara-gara server bermasalah.';
    await pilihDropdown(page, 'department', opd.nama);
    await pilihDropdown(page, 'category', KATEGORI.label);
    await page.getByLabel('Judul Laporan').fill('[UJI E2E] Pengiriman gagal');
    await page.getByLabel('Uraian Detail Kejadian').fill(uraian);

    let jumlahPost = 0;
    await page.route('**/complaints', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      jumlahPost += 1;
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Layanan sedang tidak tersedia' }),
      });
    });

    await page.getByRole('button', { name: 'Kirim Laporan' }).click();
    await expect(page.getByText('Layanan sedang tidak tersedia')).toBeVisible({ timeout: 15000 });

    // Penjaga: kalau POST-nya tak pernah terjadi, pengujian ini tak menguji
    // apa pun dan pernyataan di bawah tak berarti (lihat §Y.5 TEST_CASES).
    expect(jumlahPost, 'POST /complaints tak pernah terkirim — pengujiannya yang salah').toBe(1);

    await expect(page).toHaveURL(/\/complaints\/new/);
    await expect(page.getByLabel('Uraian Detail Kejadian')).toHaveValue(uraian);
    await expect(page.getByRole('button', { name: 'Kirim Laporan' })).toBeEnabled();
  });
});
