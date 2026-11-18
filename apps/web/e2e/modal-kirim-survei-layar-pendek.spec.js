import { test, expect } from '@playwright/test';
import { AKUN, BASE_URL, masukApi, musnahkanSurveiUji, panggilApi } from './support/api';
import { kotakSesudahGulir, utuhTerlihat } from './support/tata-letak';

/**
 * Modal kirim survei anonim di layar pendek (BUG-090, TC-FILL-043).
 *
 * Lebih dari pola BUG-084. Latar `ModalKirimSurvei` `fixed inset-0`, tetapi
 * bingkai kartu survei di `app/survei/[id]/page.jsx` memakai
 * `backdrop-filter`, yang menjadikannya blok penampung bagi keturunan
 * ber-`position: fixed`. `inset-0` lalu diukur dari bingkai itu, bukan dari
 * layar: latarnya tak menutupi halaman, klik di luar bingkai tak menutup
 * modal, dan kartunya terpotong. Karena itu uji ini memeriksa latar menutupi
 * seluruh layar, isi kartu dapat digulir hingga utuh terlihat, dan klik latar
 * menutup modal.
 *
 * Pasangannya, BUG-091 (`ConfirmActionModal` 4 px pada 568x320), ditolak:
 * diukur di spec ini sebelum dibuang, judul dan kedua tombolnya utuh di
 * dalam layar; yang keluar layar hanya tepi kartu di dalam bantalannya.
 *
 * MENULIS DATA: satu survei uji milik Admin OPD (dimusnahkan di `afterAll`).
 * Tombol kirim tak pernah ditekan, jadi tak ada respons yang tersimpan.
 */

const LAYAR = [
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 640, height: 360 },
  { width: 568, height: 320 },
];

const JUDUL = '[UJI MODAL-KIRIM] Survei kepuasan layanan perizinan terpadu satu pintu';

let surveiAnonim;

test.beforeAll(async () => {
  const { token } = await masukApi(AKUN.adminOpd);
  const buat = (data) => panggilApi(token, 'POST', '/surveys', { periode: '2026-Q4', ...data });
  surveiAnonim = (await buat({ judul: JUDUL, jenis: 'skm_permenpanrb', izinkanAnonim: true })).id;
  await panggilApi(token, 'PATCH', `/surveys/${surveiAnonim}/status`, { status: 'aktif' });
});

test.afterAll(async () => {
  if (surveiAnonim) await musnahkanSurveiUji(surveiAnonim);
});

async function periksaTerjangkau(daftar, { width, height }) {
  for (const [nama, el] of [...daftar, [`${daftar[0][0]} (kembali ke atas)`, daftar[0][1]]]) {
    const kotak = await kotakSesudahGulir(el);
    expect
      .soft(
        utuhTerlihat(kotak, height, width),
        `${width}x${height}: ${nama} tak dapat digulir hingga utuh terlihat: ${JSON.stringify(kotak)}`,
      )
      .toBe(true);
  }
}

/** Klik latar di pojok kiri atas layar harus menutup modal (penjaga perbaikan). */
async function periksaKlikLatarMenutup(page, dialog, { width, height }) {
  await page.mouse.click(4, 4);
  await expect
    .soft(dialog, `${width}x${height}: klik latar tidak menutup modal`)
    .toBeHidden({ timeout: 3000 });
}

test('BUG-090: modal kirim survei anonim menutupi layar dan dapat digulir', async ({ browser }) => {
  test.setTimeout(300_000);

  for (const layar of LAYAR) {
    // Peramban tanpa sesi: modal ini hanya ada di jalur tanpa akun.
    const ctx = await browser.newContext({ viewport: layar });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/isi/${surveiAnonim}`);

    const mulai = page.getByRole('button', { name: /Setuju & Mulai Isi/i });
    await mulai.waitFor({ timeout: 60_000 });
    await page.getByRole('checkbox', { name: /isi survei sebagai anonim/i }).check();
    await page.getByRole('checkbox', { name: /menyetujui pemrosesan data saya/i }).check();
    await mulai.click();

    // Jawaban dipilih LEBIH DULU di tiap putaran, termasuk pertanyaan
    // terakhir: "Selesaikan" mati sampai pertanyaan yang tampil terjawab.
    const selesaikan = page.getByRole('button', { name: /^Selesaikan$/ });
    const lanjut = page.getByRole('button', { name: /^(Pertanyaan Selanjutnya|Selanjutnya)$/ });
    for (let i = 0; i < 15; i += 1) {
      const pilihan = page.locator('label:has(input[type="radio"])');
      await pilihan.first().waitFor();
      await pilihan.last().click();
      const tombol = lanjut.or(selesaikan).first();
      await expect(tombol).toBeEnabled();
      if (await selesaikan.isVisible()) break;
      await lanjut.click();
    }
    await selesaikan.click();

    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    // Latar memudar 200 ms dan kartu membesar `zoom-in-95`; ukur sesudahnya.
    await page.waitForTimeout(400);

    // Latar harus menutupi SELURUH layar, bukan hanya kotak kartu survei.
    const latar = await dialog.evaluate((el) => {
      let p = el.parentElement;
      while (p && getComputedStyle(p).position !== 'fixed') p = p.parentElement;
      if (!p) return null;
      const b = p.getBoundingClientRect();
      return { top: b.top, left: b.left, width: b.width, height: b.height };
    });
    expect
      .soft(
        latar,
        `${layar.width}x${layar.height}: latar modal tidak menutupi layar: ${JSON.stringify(latar)}`,
      )
      .toEqual({ top: 0, left: 0, width: layar.width, height: layar.height });

    await periksaTerjangkau(
      [
        ['judul', dialog.locator('#judul-kirim-survei')],
        ['tombol Tutup', dialog.getByRole('button', { name: 'Tutup' })],
        ['tombol Batal', dialog.getByRole('button', { name: 'Batal' })],
        ['tombol Kirim Survei', dialog.getByRole('button', { name: /Kirim Survei|Mengirim/ })],
      ],
      layar,
    );
    await periksaKlikLatarMenutup(page, dialog, layar);
    await ctx.close();
  }
});
