import { test, expect } from '@playwright/test';
import { ukurLuberan, ukurTeksTerpotong } from './fixtures/responsif';

/**
 * PAGAR UNTUK DETEKTORNYA SENDIRI (22 Oktober 2026).
 *
 * Seluruh spec responsif di direktori ini bersandar pada dua pengukur di
 * `fixtures/responsif.ts`, dan sampai hari ini tak satu pun yang menguji
 * pengukurnya. Akibatnya terukur: pada sapuan 22 Oktober, tujuh dari tiga belas
 * kegagalan ternyata bukan cacat tata letak melainkan cacat detektor, dan
 * ketujuhnya sudah merah sejak 7 Oktober tanpa ada yang membantahnya.
 *
 * KENAPA HALAMAN BUATAN, BUKAN HALAMAN APLIKASI. Pengukurnya harus dihadapkan
 * pada kasus yang bentuknya DIKETAHUI -- satu elemen yang memang dipotong
 * dengan sengaja, satu lagi yang isinya benar-benar hilang. Halaman aplikasi
 * berubah tiap minggu dan tak dapat menjamin kedua bentuk itu hadir bersamaan,
 * sehingga pagar yang bersandar padanya akan diam-diam berhenti menguji apa
 * yang dimaksud.
 *
 * TAK ADA SESI DAN TAK ADA BASIS DATA di sini: `page.setContent` saja.
 * Karena itu berkas ini tak pernah melewati dirinya sendiri karena
 * `E2E_IDENTIFIER` kosong, berbeda dari spec lain di direktori ini.
 *
 * SETIAP PELONGGARAN DIDAMPINGI KENDALI. Melonggarkan sebuah detektor tanpa
 * membuktikan ia masih menangkap kerusakan sungguhan sama saja mematikannya,
 * dan alarm yang mati terlihat persis seperti alarm yang tak pernah berbunyi.
 */
test.use({ viewport: { width: 320, height: 720 } });

/** Potongan `sr-only` Tailwind, disalin apa adanya dari keluaran produksinya. */
const GAYA = `
  <style>
    body { margin: 0; font: 16px sans-serif; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
    }
    .potong-elipsis {
      position: absolute; left: 155px; top: 100px; width: 165px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .potong-polos {
      position: absolute; left: 155px; top: 200px; width: 165px;
      overflow: hidden; white-space: nowrap;
    }
  </style>
`;

const NAMA_PANJANG = 'Admin Kabupaten (Contoh) dengan nama yang panjang sekali';

test.describe('ukurLuberan', () => {
  /**
   * Bentuk yang persis ditemui di `RecentActivities.jsx:73`: sebuah `span`
   * sebaris di dalam paragraf ber-`truncate`. Kotak geometris `span` itu TIDAK
   * dipotong oleh `overflow: hidden` induknya -- `getBoundingClientRect`
   * mengembalikan kotak tata letak yang utuh -- sehingga ia terbaca keluar
   * layar padahal yang terlihat mata hanyalah elipsis di tepi paragrafnya.
   */
  test('teks yang dipotong dengan elipsis BUKAN luberan', async ({ page }) => {
    await page.setContent(`${GAYA}<p class="potong-elipsis"><span>${NAMA_PANJANG}</span></p>`);

    const { pelanggar, luberHalaman } = await ukurLuberan(page);

    expect(luberHalaman, 'halamannya sendiri tidak boleh meluber').toBe(0);
    expect(pelanggar.map((p) => p.teks)).toEqual([]);
  });

  /**
   * KENDALI PERTAMA. `overflow: hidden` TANPA elipsis memotong tanpa memberi
   * tanda apa pun: tak ada titik-titik, tak ada batang gulir, dan isinya tak
   * dapat dicapai dengan cara apa pun. Itu memang cacat, dan pelonggaran di
   * atas tidak boleh ikut menelannya.
   */
  test('KENDALI: potongan tanpa elipsis TETAP dilaporkan', async ({ page }) => {
    await page.setContent(`${GAYA}<p class="potong-polos"><span>${NAMA_PANJANG}</span></p>`);

    const { pelanggar } = await ukurLuberan(page);

    expect(pelanggar.length, 'detektornya berhenti menangkap potongan tanpa tanda').toBeGreaterThan(
      0,
    );
  });

  /**
   * KENDALI KEDUA, untuk kerusakan yang paling sering dilaporkan pengguna:
   * elemen yang benar-benar menjorok keluar layar tanpa ada yang memotongnya.
   */
  test('KENDALI: elemen yang sungguh keluar layar TETAP dilaporkan', async ({ page }) => {
    await page.setContent(
      `${GAYA}<div style="position:absolute; left:250px; top:300px; width:200px; height:40px;">Kartu yang menjorok</div>`,
    );

    const { pelanggar } = await ukurLuberan(page);

    expect(pelanggar.map((p) => p.teks)).toContain('Kartu yang menjorok');
  });
});

test.describe('ukurTeksTerpotong', () => {
  /**
   * `sr-only` berukuran 1x1 piksel ATAS KEMAUAN SENDIRI: ia memang menyimpan
   * teks yang jauh lebih besar daripada kotaknya, sebab tujuannya dibaca
   * pembaca layar dan tidak dilihat mata. Melaporkannya sebagai teks terpotong
   * berarti menghukum justru markah yang membuat kontrolnya punya nama.
   */
  test('label sr-only BUKAN teks terpotong', async ({ page }) => {
    await page.setContent(`${GAYA}<label class="sr-only">Triwulan</label>`);

    expect(await ukurTeksTerpotong(page)).toEqual([]);
  });

  /**
   * KENDALI. Teks yang terpotong tanpa elipsis di dalam kotak berukuran WAJAR
   * tetap kerusakan: pembacanya melihat kalimat yang terputus begitu saja.
   */
  test('KENDALI: teks terpotong di kotak berukuran wajar TETAP dilaporkan', async ({ page }) => {
    await page.setContent(`${GAYA}<p class="potong-polos">${NAMA_PANJANG}</p>`);

    const hasil = await ukurTeksTerpotong(page);

    expect(hasil.length, 'detektornya berhenti menangkap teks yang terputus').toBeGreaterThan(0);
  });
});
