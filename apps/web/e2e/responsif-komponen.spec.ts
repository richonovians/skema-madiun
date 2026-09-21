import {
  test,
  expect,
  ambilContoh,
  ukurLuberan,
  ukurGulirTersembunyi,
  ukurTargetSentuh,
  ukurTeksTerpotong,
  type Contoh,
  type Peran,
} from './fixtures/responsif';

/**
 * TATA LETAK KOMPONEN YANG BARU MUNCUL SESUDAH DIBUKA (21 September 2026).
 *
 * Audit responsif 17 September hanya mengukur keadaan AWAL tiap halaman, dan
 * pada 164 pengukuran itu hanya satu halaman yang benar-benar rusak. Tetapi
 * seluruh riwayat kerusakan responsif di proyek ini justru berada di komponen
 * yang harus dibuka lebih dulu: panel notifikasi terukur `kiri=-60`, menu
 * ekspor `kiri=-92`, modal "Teruskan" terpotong modalnya sendiri. Tak satu pun
 * dari itu dapat terlihat tanpa mengkliknya.
 *
 * KENAPA PLAYWRIGHT, BUKAN JEST. jsdom tak menghitung tata letak sama sekali --
 * setiap elemen berukuran nol di sana -- sehingga luberan mustahil diukur di
 * uji komponen. Berkas ini satu-satunya tempat pertanyaan "apakah ia keluar
 * layar" dapat dijawab sungguhan.
 *
 * KENAPA AMAN DIJALANKAN DI ATAS DATA SUNGGUHAN. Modal di sini termasuk
 * konfirmasi hapus dan hapus permanen. Fixture `bukaSebagai` memblokir SETIAP
 * permintaan non-GET di tingkat jaringan peramban (`route.abort`), jadi tombol
 * merah yang tertekan tanpa sengaja pun tak dapat mencapai server. Data nyata
 * dipakai dengan sengaja: nama OPD yang panjang dan nomor tiket tanpa spasi
 * justru itulah yang merusak tata letak, dan data seed tak memilikinya.
 *
 * Menjalankannya:
 *   E2E_IDENTIFIER=<email akun uji> pnpm --filter @skm-spm/web test:e2e
 */

/**
 * Batas waktu dilonggarkan dari 30 detik bawaan: server dev Next mengompilasi
 * tiap rute saat pertama dibuka, dan beberapa worker yang meminta rute berbeda
 * sekaligus membuat pemuatan pertama itu benar-benar lambat. Terukur: satu
 * `page.goto` ke dasbor melewati 30 detik tanpa ada yang rusak sama sekali.
 */
test.describe.configure({ timeout: 90_000 });

const LEBAR = [
  { nama: '320px', viewport: { width: 320, height: 720 } },
  { nama: '390px', viewport: { width: 390, height: 844 } },
] as const;

/** Gagalnya menyebutkan elemen mana yang keluar, bukan sekadar "tidak nol". */
async function harusMuatDiLayar(page: import('@playwright/test').Page, keterangan: string) {
  const hasil = await ukurLuberan(page);
  expect(
    { keterangan, luber: hasil.luberHalaman, pelanggar: hasil.pelanggar },
    `${keterangan} keluar layar`,
  ).toEqual({ keterangan, luber: 0, pelanggar: [] });
}

for (const { nama, viewport } of LEBAR) {
  test.describe(`Tata letak di ${nama}`, () => {
    test.use({ viewport });

    let contoh: Contoh = {};
    test.beforeAll(async () => {
      contoh = await ambilContoh();
    });

    /**
     * PENGUNCI REGRESI. Halaman ini menggulir ke samping 118px pada 320 dan
     * 48px pada 390 sampai 17 September 2026; sebabnya baris kepala yang tak
     * pernah membungkus, dan menu ekspornyalah yang terlempar keluar. Uji Jest
     * yang menyertai perbaikan itu hanya dapat mengunci kelasnya, bukan
     * luberannya -- inilah yang mengukurnya.
     */
    test('detail pengaduan Admin OPD tidak menggulir ke samping', async ({ page, bukaSebagai }) => {
      test.skip(!contoh.tiketOpd, 'Tak ada pengaduan pada basis data mesin ini.');

      await bukaSebagai('opd', `/admin-opd/complaints/${contoh.tiketOpd}`);

      await harusMuatDiLayar(page, 'detail pengaduan Admin OPD');
    });

    test('menu ekspor pada detail pengaduan tetap di dalam layar', async ({
      page,
      bukaSebagai,
    }) => {
      test.skip(!contoh.tiketOpd, 'Tak ada pengaduan pada basis data mesin ini.');

      await bukaSebagai('opd', `/admin-opd/complaints/${contoh.tiketOpd}`);
      await page
        .getByRole('button', { name: /^ekspor/i })
        .first()
        .click();
      await page.waitForTimeout(500);

      await harusMuatDiLayar(page, 'menu ekspor');
    });

    test('panel template pesan tetap di dalam layar', async ({ page, bukaSebagai }) => {
      test.skip(!contoh.tiketOpd, 'Tak ada pengaduan pada basis data mesin ini.');

      await bukaSebagai('opd', `/admin-opd/complaints/${contoh.tiketOpd}`);
      await page.getByRole('button', { name: /template pesan/i }).click();
      await expect(page.getByText(/pilih template pesan/i)).toBeVisible();

      await harusMuatDiLayar(page, 'panel template pesan');
    });

    test('laci navigasi admin tetap di dalam layar saat dibuka', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/dashboard');
      await page.getByRole('button', { name: /buka menu navigasi/i }).click();
      await page.waitForTimeout(500);

      await harusMuatDiLayar(page, 'laci navigasi');
    });

    test('panel notifikasi tetap di dalam layar saat dibuka', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/dashboard');
      await page
        .getByRole('button', { name: /^notifikasi/i })
        .first()
        .click();
      await expect(page.getByRole('link', { name: /lihat semua notifikasi/i })).toBeVisible();

      await harusMuatDiLayar(page, 'panel notifikasi');
    });

    test('menu akun tetap di dalam layar saat dibuka', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/dashboard');
      await page
        .getByRole('button', { name: /menu akun/i })
        .first()
        .click();
      await page.waitForTimeout(500);

      await harusMuatDiLayar(page, 'menu akun');
    });

    /**
     * Modal "Buat Survei" TIDAK diukur di sini, dan sebabnya perlu dicatat:
     * tombol pemicunya tak punya nama yang dapat diakses sama sekali. Labelnya
     * disembunyikan di layar sempit tanpa `aria-label` pengganti, sehingga
     * `getByRole('button', { name: ... })` tak menemukannya -- dan pembaca layar
     * pun hanya menyebut "tombol". Itu cacat tersendiri (pola yang sama dengan
     * BUG-002 pada lonceng notifikasi, 2 September 2026), bukan sesuatu yang
     * boleh ditambal di dalam uji dengan pemilih berbasis urutan DOM.
     */
    test('modal bagikan survei tetap di dalam layar', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/surveys');
      const tombol = page.getByRole('button', { name: /^bagikan$/i }).first();
      test.skip((await tombol.count()) === 0, 'Tak ada survei yang dapat dibagikan.');

      await tombol.click();
      await page.waitForTimeout(700);

      await harusMuatDiLayar(page, 'modal bagikan survei');
    });

    /**
     * Konfirmasi hapus dibuka dengan sengaja. Ia salah satu modal terpanjang di
     * aplikasi ini, dan justru modal panjang yang paling sering terpotong di
     * layar pendek. Tombol merah di dalamnya tak berbahaya: permintaan
     * menulisnya diblokir sebelum meninggalkan peramban.
     */
    test('konfirmasi hapus survei tetap di dalam layar', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/surveys');
      const tombol = page.getByRole('button', { name: /^hapus$/i }).first();
      test.skip((await tombol.count()) === 0, 'Tak ada survei yang dapat dihapus.');

      await tombol.click();
      await page.waitForTimeout(700);

      await harusMuatDiLayar(page, 'konfirmasi hapus survei');
    });

    test('konfirmasi hapus permanen di Sampah tetap di dalam layar', async ({
      page,
      bukaSebagai,
    }) => {
      await bukaSebagai('kabupaten', '/admin-kab/surveys/sampah');
      const tombol = page.getByRole('button', { name: /hapus permanen/i }).first();
      test.skip((await tombol.count()) === 0, 'Sampah kosong pada basis data mesin ini.');

      await tombol.click();
      await page.waitForTimeout(700);

      await harusMuatDiLayar(page, 'konfirmasi hapus permanen');
    });

    test('penyaring daftar pengaduan tetap di dalam layar saat dibuka', async ({
      page,
      bukaSebagai,
    }) => {
      await bukaSebagai('kabupaten', '/admin-kab/complaints');
      const tombol = page.getByRole('button', { name: /^filter$/i }).first();
      test.skip((await tombol.count()) === 0, 'Tak ada tombol penyaring di halaman ini.');

      await tombol.click();
      await page.waitForTimeout(500);

      await harusMuatDiLayar(page, 'penyaring daftar pengaduan');
    });

    /**
     * PENJAGA ALAT UKURNYA SENDIRI. Seluruh uji di atas berbunyi "tidak ada yang
     * keluar layar" -- kalimat yang juga benar pada halaman yang gagal dimuat
     * dan kosong melompong. Tanpa uji ini, sesi yang tak sah akan membuat
     * seluruh berkas ini hijau tanpa mengukur apa pun.
     */
    test('KONTROL: halamannya benar-benar berisi, bukan kosong', async ({ page, bukaSebagai }) => {
      await bukaSebagai('kabupaten', '/admin-kab/dashboard');

      await expect(page.getByRole('button', { name: /buka menu navigasi/i })).toBeVisible();
      const panjang = await page.evaluate(() => (document.body.innerText || '').trim().length);
      expect(panjang).toBeGreaterThan(600);
    });
  });
}

/**
 * Suite ini membuka modal hapus di atas basis data sungguhan, jadi janji "tak
 * ada yang tertulis" harus DIBUKTIKAN, bukan dipercaya.
 *
 * Pembuktiannya tidak dengan memburu tombol merah di dalam modal -- tombol
 * mana yang muncul bergantung pada isi basis data tiap mesin, dan uji yang
 * bergantung pada itu akan diam-diam melewati dirinya sendiri di mesin yang
 * datanya berbeda. Yang dilakukan di sini lebih keras: halamannya disuruh
 * mengirim permintaan menulis secara langsung, lalu dibuktikan permintaan itu
 * tak pernah sampai DAN tak mengubah apa pun.
 */
test.describe('Penjaga: permintaan menulis tak pernah mencapai server', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('POST dari halaman dibatalkan, dan jumlah data tidak berubah', async ({
    page,
    bukaSebagai,
  }) => {
    await bukaSebagai('kabupaten', '/admin-kab/surveys');

    // Header `Authorization` dipasang sendiri: pada jalur dev-login tokennya
    // dipegang frontend di localStorage dan disisipkan axios, jadi `fetch`
    // mentah tanpa header ini hanya akan dijawab 401 -- dan penjaga yang selalu
    // gagal karena sebab lain tak membuktikan apa pun.
    const hitung = async () =>
      page.evaluate(async () => {
        const res = await fetch('/api/v1/surveys?limit=1', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        return (await res.json())?.meta?.pagination?.total ?? null;
      });

    const sebelum = await hitung();
    expect(sebelum, 'jumlah survei harus terbaca supaya penjaga ini berarti').not.toBeNull();

    const hasil = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/v1/surveys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ judul: 'JANGAN PERNAH TERSIMPAN' }),
        });
        return { sampai: true, status: res.status };
      } catch (e) {
        return { sampai: false, galat: String(e) };
      }
    });

    expect(hasil.sampai, 'permintaan menulis TIDAK boleh mencapai server').toBe(false);
    expect(await hitung(), 'jumlah survei tidak boleh berubah').toBe(sebelum);
  });

  /**
   * KONTROL. Tanpa ini, penjaga di atas tetap hijau seandainya `fetch` memang
   * selalu gagal karena sebab lain -- alamat salah, server mati, atau sesi tak
   * sah. Yang harus dibuktikan adalah bahwa yang diblokir hanyalah permintaan
   * MENULIS, sementara membaca tetap lewat.
   */
  test('KONTROL: permintaan membaca tetap diteruskan', async ({ page, bukaSebagai }) => {
    await bukaSebagai('kabupaten', '/admin-kab/surveys');

    const hasil = await page.evaluate(async () => {
      const res = await fetch('/api/v1/surveys?limit=1', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return { status: res.status };
    });

    expect(hasil.status).toBe(200);
  });
});

/**
 * ISI YANG MELEBAR TANPA BATANG GULIR YANG TERLIHAT (21 September 2026).
 *
 * Titik buta alat ukurnya sendiri. `ukurLuberan` sengaja melewati apa pun yang
 * berada di dalam wadah `overflow-x: auto` -- kalau tidak, setiap tabel lebar
 * yang memang disediakan untuk digulir ikut terlaporkan rusak. Wadah yang
 * batang gulirnya disembunyikan tampak persis sama bagi saringan itu, padahal
 * bagi pemakai tetikus tak ada apa pun yang memberi tahu bahwa isinya masih
 * berlanjut ke kanan.
 *
 * Terukur di dasbor Admin Kabupaten: pada 768px wadahnya selebar 464px berisi
 * bagan 600px, pada 900px selebar 596px berisi 600px. Sebabnya penjaga lebar
 * `md:min-w-[600px]` yang menyala sejak 768px, sementara grid tiga kolom yang
 * hendak dijaganya baru dimulai pada `lg` (1024px).
 */
for (const { nama, viewport } of [
  { nama: '768px', viewport: { width: 768, height: 1024 } },
  { nama: '900px', viewport: { width: 900, height: 700 } },
] as const) {
  test.describe(`Batang gulir di ${nama}`, () => {
    test.use({ viewport });

    test('dasbor Admin Kabupaten tak menyembunyikan isi yang melebar', async ({
      page,
      bukaSebagai,
    }) => {
      await bukaSebagai('kabupaten', '/admin-kab/dashboard');

      const tersembunyi = await ukurGulirTersembunyi(page);
      expect(tersembunyi, `isi melebar tanpa batang gulir di ${nama}`).toEqual([]);
    });
  });
}

/** Halaman yang dipakai sapuan lebar, lanskap, dan sasaran sentuh. */
const HALAMAN_UTAMA: Array<[string, Peran, string]> = [
  ['dasbor Admin Kabupaten', 'kabupaten', '/admin-kab/dashboard'],
  ['daftar survei Admin Kabupaten', 'kabupaten', '/admin-kab/surveys'],
  ['daftar pengaduan Admin Kabupaten', 'kabupaten', '/admin-kab/complaints'],
  ['daftar pengaduan Admin OPD', 'opd', '/admin-opd/complaints'],
  ['statistik Admin OPD', 'opd', '/admin-opd/analytics'],
  ['beranda', 'responden', '/'],
];

/**
 * LAYAR LEBAR DAN LANSKAP (21 September 2026).
 *
 * Seluruh audit sebelumnya berhenti di 414px. Yang belum pernah ditanya: apa
 * yang terjadi di monitor 1440px, dan apa yang terjadi ketika ponsel diputar
 * -- 844x390 memberi tinggi hanya 390px, dan modal serta laci yang dirancang
 * untuk layar tegak justru di situ kehabisan ruang.
 */
for (const { nama, viewport } of [
  { nama: '1440px', viewport: { width: 1440, height: 900 } },
  { nama: 'lanskap 844x390', viewport: { width: 844, height: 390 } },
] as const) {
  test.describe(`Tata letak di ${nama}`, () => {
    test.use({ viewport });

    for (const [judul, peran, path] of HALAMAN_UTAMA) {
      test(`${judul} muat di ${nama}`, async ({ page, bukaSebagai }) => {
        await bukaSebagai(peran, path);

        await harusMuatDiLayar(page, `${judul} @ ${nama}`);
        expect(await ukurGulirTersembunyi(page), `${judul} @ ${nama}`).toEqual([]);
      });
    }
  });
}

/**
 * SASARAN SENTUH DAN TEKS YANG TERPOTONG (21 September 2026).
 *
 * Dua pertanyaan yang tak pernah diukur, dan keduanya hanya dapat dijawab di
 * peramban: seberapa besar yang harus disentuh, dan apakah ada huruf yang
 * benar-benar hilang dibaca. Batas 44px bukan angka dari luar -- proyek ini
 * sudah memakai `min-h-[44px]` di belasan tempat; yang kurang adalah
 * penerapannya yang merata.
 *
 * YANG DIUKUR ADALAH KEADAAN SUDAH MASUK, sebab fixture memang memasang sesi.
 * Navbar versi KELUAR belum tersentuh sapuan ini, dan di sana ada dua sasaran
 * yang masih di bawah 44px -- terukur 21 September 2026: tombol "Masuk via SSO
 * Helpdesk" setinggi 40px dan tautan "akun dev" setinggi 16px
 * (SSOLoginButton.jsx). Keduanya SENGAJA dibiarkan di sini: tinggi 40px milik
 * varian `navLogin` adalah keputusan tersurat 14 September 2026 atas permintaan
 * pengguna, disamakan dengan RegistrasiHelpdeskLink supaya dua pil bersebelahan
 * tak berbeda tinggi. Menaikkannya sepihak akan membatalkan permintaan itu.
 */
for (const { nama, viewport } of LEBAR) {
  test.describe(`Sasaran sentuh di ${nama}`, () => {
    test.use({ viewport });

    for (const [judul, peran, path] of HALAMAN_UTAMA) {
      test(`${judul}: tak ada sasaran di bawah 44px`, async ({ page, bukaSebagai }) => {
        await bukaSebagai(peran, path);

        expect(await ukurTargetSentuh(page), `${judul} @ ${nama}`).toEqual([]);
      });

      test(`${judul}: tak ada teks yang terpotong`, async ({ page, bukaSebagai }) => {
        await bukaSebagai(peran, path);

        expect(await ukurTeksTerpotong(page), `${judul} @ ${nama}`).toEqual([]);
      });
    }
  });
}

/**
 * TIGA RUTE YANG BELUM PERNAH TERSENTUH PENGUKURAN (21 September 2026).
 *
 * Ketiganya luput karena alasan yang sama: tak satu pun dapat dicapai dengan
 * mengeklik dari halaman lain. `/complaints/success` hanya muncul sesudah
 * sebuah pengaduan terkirim, `/sso/callback` hanya sebagai tujuan pengalihan
 * dari Helpdesk, dan detail audit hanya lewat alamat bernomor.
 *
 * `/sso/callback` diukur dalam keadaan GAGAL, tanpa parameter kode. Itu bukan
 * kelonggaran: keadaan berhasil hanya tampak beberapa ratus milidetik sebelum
 * pengguna diantar pergi, sedangkan keadaan gagal justru yang bertahan di
 * layar -- dan karena itu yang perlu muat.
 *
 * Nama OPD sengaja dibuat sepanjang yang sungguhan ada di Kabupaten Madiun:
 * kata tunggal yang panjang itulah yang merusak tata letak, bukan kalimat
 * pendek milik data seed.
 */
for (const { nama, viewport } of LEBAR) {
  test.describe(`Rute yang jarang dilihat di ${nama}`, () => {
    test.use({ viewport });

    let contoh: Contoh = {};
    test.beforeAll(async () => {
      contoh = await ambilContoh();
    });

    test('halaman berhasil kirim pengaduan muat di layar', async ({ page, bukaSebagai }) => {
      const opd = encodeURIComponent(
        'Dinas Komunikasi Informatika Statistik dan Persandian Kabupaten Madiun',
      );
      await bukaSebagai(
        'responden',
        `/complaints/success?complaintId=${contoh.tiketResponden ?? 'PGD20260101UJI'}&opdName=${opd}`,
      );

      await expect(page.getByText(/berhasil/i).first()).toBeVisible();
      await harusMuatDiLayar(page, 'halaman berhasil kirim pengaduan');
    });

    test('halaman transisi SSO muat di layar saat gagal', async ({ page, bukaSebagai }) => {
      await bukaSebagai('responden', '/sso/callback');
      await page.waitForTimeout(1500);

      const panjang = await page.evaluate(() => (document.body.innerText || '').trim().length);
      expect(panjang, 'halaman transisi SSO kosong, tak ada yang diukur').toBeGreaterThan(100);
      await harusMuatDiLayar(page, 'halaman transisi SSO');
    });

    test('detail audit log muat di layar', async ({ page, bukaSebagai }) => {
      test.skip(!contoh.auditId, 'Tak ada baris audit pada basis data mesin ini.');

      await bukaSebagai('kabupaten', `/admin-kab/audit-logs/${contoh.auditId}`);

      const panjang = await page.evaluate(() => (document.body.innerText || '').trim().length);
      expect(panjang, 'detail audit kosong, tak ada yang diukur').toBeGreaterThan(100);
      await harusMuatDiLayar(page, 'detail audit log');
    });
  });
}
