import { readFileSync } from 'node:fs';
import { test as base, expect, request, type Page } from '@playwright/test';
import { BERKAS_TOKEN } from '../global-setup';

export type Peran = 'responden' | 'opd' | 'kabupaten';

export const LEBAR_PONSEL = { width: 320, height: 720 };
export const LEBAR_PONSEL_UMUM = { width: 390, height: 844 };

function bacaToken(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(BERKAS_TOKEN, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Satu elemen yang keluar layar, beserta alasan ia dianggap cacat.
 */
export interface Pelanggar {
  el: string;
  keluar: number;
  lebar: number;
  teks: string;
}

export interface Ukuran {
  luberHalaman: number;
  pelanggar: Pelanggar[];
}

/**
 * Mengukur apa yang keluar layar, DI DALAM halaman.
 *
 * Tiga saringan di bawah bukan kelonggaran, melainkan hasil audit 17 September
 * yang mula-mula melaporkan 20-an "kerusakan" palsu:
 *
 * 1. Elemen yang SELURUHNYA di luar layar dilewati -- itu laci sidebar yang
 *    memang digeser keluar sampai dibuka, bukan tata letak yang rusak.
 * 2. Elemen yang leluhurnya dapat digulir mendatar dilewati -- tabel lebar di
 *    dalam `overflow-x-auto` memang disediakan untuk digulir.
 * 3. Hiasan dilewati: tanpa teks DAN (berpendar atau tak dapat disentuh).
 *    Lingkaran gradien di beranda, Tentang, dan Profil memang dirancang
 *    menjorok keluar tepi kartunya.
 */
const UKUR = (): Ukuran => {
  const doc = document.documentElement;
  const vw = window.innerWidth;

  const gambaran = (el: Element) =>
    `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').trim().replace(/\s+/g, '.')}`.slice(
      0,
      140,
    );

  const leluhurDapatDigulir = (el: Element) => {
    let p = el.parentElement;
    while (p && p !== doc) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll'].includes(s.overflowX)) return true;
      if (['hidden', 'clip'].includes(s.overflowX)) return false;
      p = p.parentElement;
    }
    return false;
  };

  const pelanggar: Pelanggar[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= 0 || r.left >= vw) continue;
    const keluar = Math.round(Math.max(r.right - vw, -r.left));
    if (keluar <= 1) continue;
    if (leluhurDapatDigulir(el)) continue;

    const s = getComputedStyle(el);
    const teks = (el.textContent || '').trim();
    const hiasan = teks === '' && (s.filter !== 'none' || s.pointerEvents === 'none');
    if (hiasan) continue;

    pelanggar.push({
      el: gambaran(el),
      keluar,
      lebar: Math.round(r.width),
      teks: teks.slice(0, 40),
    });
  }

  return {
    luberHalaman: Math.max(0, doc.scrollWidth - doc.clientWidth),
    pelanggar: pelanggar.sort((a, b) => b.keluar - a.keluar).slice(0, 5),
  };
};

export async function ukurLuberan(page: Page): Promise<Ukuran> {
  return page.evaluate(UKUR);
}

export interface GulirTersembunyi {
  el: string;
  klien: number;
  isi: number;
  teks: string;
}

/**
 * Mencari isi yang melebar TANPA batang gulir yang terlihat.
 *
 * `UKUR` di atas sengaja melewati apa pun yang berada di dalam wadah
 * `overflow-x: auto`, sebab tabel lebar yang dapat digulir bukan kerusakan.
 * Saringan itu punya titik buta: wadah yang batang gulirnya disembunyikan
 * tampak persis sama bagi detektor, padahal bagi pemakai tetikus tak ada
 * apa pun yang memberi tahu bahwa isinya masih berlanjut ke kanan.
 *
 * Yang diperiksa karena itu bukan nama kelasnya, melainkan keadaannya:
 * elemen yang benar-benar dapat digulir mendatar sementara
 * `scrollbar-width` bernilai `none`.
 */
const UKUR_GULIR_TERSEMBUNYI = (): GulirTersembunyi[] => {
  const hasil: GulirTersembunyi[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const s = getComputedStyle(el);
    if (!['auto', 'scroll'].includes(s.overflowX)) continue;
    if ((s as unknown as { scrollbarWidth?: string }).scrollbarWidth !== 'none') continue;
    hasil.push({
      el: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').trim().replace(/\s+/g, '.')}`.slice(
        0,
        120,
      ),
      klien: el.clientWidth,
      isi: el.scrollWidth,
      teks: (el.textContent || '').trim().slice(0, 40),
    });
  }
  return hasil;
};

export async function ukurGulirTersembunyi(page: Page): Promise<GulirTersembunyi[]> {
  return page.evaluate(UKUR_GULIR_TERSEMBUNYI);
}

export interface TargetKecil {
  el: string;
  lebar: number;
  tinggi: number;
  nama: string;
}

/**
 * Mencari sasaran sentuh yang lebih kecil dari 44x44 CSS px.
 *
 * Angkanya diambil dari pedoman peranti sentuh, bukan dari WCAG 2.5.8 yang
 * hanya menuntut 24px -- proyek ini sudah memakai `min-h-[44px]` di
 * belasan tempat, jadi 44 memang yang dituju.
 *
 * DUA PENGECUALIAN, dan keduanya aturan tersendiri, bukan kelonggaran:
 *
 * 1. Tautan yang mengalir di dalam kalimat (WCAG 2.5.8 "inline").
 *    Memperbesarnya merusak jarak baris teks di sekitarnya, dan pemakai selalu
 *    punya jalan lain menuju sasaran yang sama. Yang diperiksa adalah
 *    `display` HASIL HITUNG, bukan kelasnya: `inline-block` di dalam induk
 *    `flex` diblokkan menjadi `block` oleh peramban, dan tautan seperti itu
 *    memang bukan tautan di tengah kalimat -- terukur di footer, 21 September.
 * 2. Kendali borang yang terbungkus `<label>` yang sendirinya sudah 44px.
 *    Kotak centangnya boleh 20px sebab yang disentuh pengguna adalah seluruh
 *    labelnya; lihat catatan yang sudah ada di ConsentGate.jsx.
 */
const UKUR_TARGET_SENTUH = (): TargetKecil[] => {
  const pilih = 'a[href], button, input, select, textarea, [role="button"], [role="menuitem"]';
  const hasil: TargetKecil[] = [];
  for (const el of Array.from(document.querySelectorAll(pilih))) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    if (el.tagName === 'A' && s.display.startsWith('inline') && !s.display.includes('flex')) {
      continue;
    }
    const label = el.closest('label');
    if (label) {
      const rl = label.getBoundingClientRect();
      if (Math.min(rl.width, rl.height) >= 44) continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (Math.min(r.width, r.height) >= 44) continue;
    hasil.push({
      el: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').trim().replace(/\s+/g, '.')}`.slice(
        0,
        100,
      ),
      lebar: Math.round(r.width),
      tinggi: Math.round(r.height),
      nama: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
    });
  }
  return hasil;
};

export async function ukurTargetSentuh(page: Page): Promise<TargetKecil[]> {
  return page.evaluate(UKUR_TARGET_SENTUH);
}

export interface TeksTerpotong {
  el: string;
  kotak: string;
  isi: string;
  teks: string;
}

/**
 * Mencari teks yang benar-benar HILANG dibaca.
 *
 * Bukan "teks bertumpuk": mendeteksi tumpang tindih secara umum menghasilkan
 * laporan palsu tak habis-habis -- setiap anak tumpang tindih dengan
 * induknya, setiap lencana melayang di atas kartunya. Yang dapat diukur
 * bersih adalah teks yang melebihi kotaknya sendiri di dalam
 * `overflow: hidden` tanpa elipsis dan tanpa `line-clamp`: di situ
 * huruf-hurufnya terpotong tanpa tanda apa pun bahwa masih ada lanjutannya.
 *
 * DUA SARINGAN, dan keduanya hasil sapuan 21 September yang mula-mula
 * melaporkan tujuh "kerusakan" palsu di beranda:
 *
 * 1. Elemen yang punya keturunan berposisi mutlak dilewati. `scrollWidth`
 *    sebuah kartu ikut menghitung hiasan yang sengaja dijorokkan keluar --
 *    lingkaran gradien berpendar di ServiceSelector, angka raksasa
 *    `text-[8rem]` di ServiceFlow. Memotongnya justru tugas `overflow: hidden`
 *    di situ; tak ada satu huruf pun yang hilang dibaca.
 * 2. Elemen yang tak memuat teks secara langsung dilewati. Wadah hanya
 *    mewarisi `textContent` anaknya; yang ditanya di sini adalah teks yang
 *    terpotong oleh kotaknya SENDIRI.
 */
const UKUR_TEKS_TERPOTONG = (): TeksTerpotong[] => {
  const hasil: TeksTerpotong[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const teks = (el.textContent || '').trim();
    if (teks === '') continue;
    const punyaTeksSendiri = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== '',
    );
    if (!punyaTeksSendiri) continue;
    if (el.querySelector('*') !== null) {
      const adaHiasanMelayang = Array.from(el.querySelectorAll('*')).some((d) =>
        ['absolute', 'fixed'].includes(getComputedStyle(d).position),
      );
      if (adaHiasanMelayang) continue;
    }
    const s = getComputedStyle(el);
    const terkunci = (v: string) => ['hidden', 'clip'].includes(v);
    if (!terkunci(s.overflowX) && !terkunci(s.overflowY)) continue;
    if (s.textOverflow === 'ellipsis') continue;
    if ((s as unknown as { webkitLineClamp?: string }).webkitLineClamp !== 'none') continue;
    const lebarLuber = terkunci(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const tinggiLuber = terkunci(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (!lebarLuber && !tinggiLuber) continue;
    hasil.push({
      el: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').trim().replace(/\s+/g, '.')}`.slice(
        0,
        100,
      ),
      kotak: `${el.clientWidth}x${el.clientHeight}`,
      isi: `${el.scrollWidth}x${el.scrollHeight}`,
      teks: teks.slice(0, 40),
    });
  }
  return hasil;
};

export async function ukurTeksTerpotong(page: Page): Promise<TeksTerpotong[]> {
  return page.evaluate(UKUR_TEKS_TERPOTONG);
}

/** Menunggu sampai tak ada permintaan API yang berjalan. */
export async function tungguDataTiba(page: Page): Promise<void> {
  // `networkidle` TIDAK dipakai: pada audit 17 September ia meloloskan belasan
  // halaman yang datanya belum tiba, dan halaman kosong tak pernah meluber --
  // ia melapor bersih justru karena belum ada isinya.
  await page.waitForTimeout(800);
  const batas = Date.now() + 20_000;
  while (Date.now() < batas) {
    const keadaan = await page.evaluate(() => {
      const w = window as unknown as {
        __apiBerjalan?: number;
        __apiSelesai?: number;
        __apiTerakhir?: number;
      };
      return {
        berjalan: w.__apiBerjalan ?? 0,
        selesai: w.__apiSelesai ?? 0,
        diam: Date.now() - (w.__apiTerakhir ?? 0),
      };
    });
    // `selesai > 0` WAJIB. Tanpa itu penungguan berakhir sebelum halaman
    // sempat memanggil API sama sekali -- hitungan diamnya sudah lewat sejak
    // penghitungnya dipasang, sehingga halaman kosong dinyatakan siap diukur.
    // Terukur 21 September 2026: seluruh uji dasbor gagal pada "halamannya
    // benar-benar berisi" persis karena ini.
    if (keadaan.selesai > 0 && keadaan.berjalan === 0 && keadaan.diam > 1200) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(300);
}

/**
 * Contoh data yang benar-benar ada di basis data mesin ini.
 *
 * Diambil saat uji berjalan, bukan ditulis tetap: nomor tiket dan id survei
 * berbeda di tiap mesin, dan spec yang memakai angka tetap akan gagal di
 * komputer orang lain karena datanya tak ada -- kegagalan yang tak ada
 * hubungannya dengan tata letak.
 */
/**
 * Menunggu navbar publik selesai menentukan keadaan masuk.
 *
 * Navbar memulai dengan `useState(false)` lalu membalikkannya di dalam
 * `useEffect` sesudah mount -- pola yang benar untuk menghindari ketidakcocokan
 * hidrasi, tetapi artinya tombol "Masuk via SSO Helpdesk" BENAR-BENAR ada di
 * layar selama sekejap pada setiap pemuatan, bahkan ketika sesinya sah.
 *
 * `tungguDataTiba` tak menangkapnya: pembalikan itu tak menimbulkan permintaan
 * API apa pun. Terukur 21 September 2026 -- satu kali dari sekian jalan, sapuan
 * sasaran sentuh memotret navbar versi keluar dan melaporkan dua tombol yang
 * tak pernah dimaksud diukur di situ. Uji yang kadang mengukur halaman yang
 * berbeda lebih buruk daripada uji yang tak ada.
 *
 * MENUNGGU LEBIH LAMA TIDAK MENOLONG, dan itu yang diukur berikutnya: pada
 * kegagalan, `localStorage.token` SUDAH terisi dan ketiga kukinya lengkap,
 * tetapi navbar tetap menampilkan tombol masuk. Navbar menghitung keadaannya
 * satu kali di dalam `useEffect` saat mount dan sesudah itu hanya mendengarkan
 * `SESSION_CHANGED_EVENT`; bila skrip sesi menang balapan lebih lambat daripada
 * mount-nya, keputusan keliru itu tak pernah dihitung ulang. Yang dibutuhkan
 * karena itu pemuatan ulang -- sekali, dengan penyimpanan yang kini pasti ada
 * -- bukan penantian yang lebih panjang.
 *
 * Pada halaman admin tak ada tombol itu sama sekali, jadi penantian ini
 * selesai seketika.
 */
/**
 * Menolak mengukur apa pun yang bukan halaman aplikasi.
 *
 * Terukur 21 September 2026: satu jalan dari sepuluh melaporkan dua sasaran
 * sentuh bernama "Reload" dan "Back" setinggi 32px, tanpa satu pun kelas CSS.
 * Itu halaman galat bawaan Chrome, bukan beranda -- server dev sedang tak
 * menjawab pada detik itu. Uji yang mengukur halaman galat lalu menyebutnya
 * temuan akan menuduh kode yang tak bersalah, persis kegagalan yang sudah
 * pernah ditutup `panaskanRute`.
 *
 * Penandanya data flight milik App Router (`self.__next_f`), BUKAN `<nav>`:
 * `/sso/callback` sengaja dirender tanpa Navbar dan Footer, dan penjaga yang
 * menuntut `<nav>` menuduhnya gagal padahal judul halamannya membuktikan ia
 * termuat benar. Halaman galat peramban tak pernah punya penanda itu.
 *
 * Satu kali dicoba ulang, sebab penyebabnya memang sesaat; kalau tetap gagal,
 * berhenti dengan sebab yang tersurat.
 */
async function pastikanHalamanAplikasi(page: Page, path: string): Promise<void> {
  const adaAplikasi = async () =>
    page.evaluate(
      () =>
        (self as unknown as { __next_f?: unknown }).__next_f !== undefined &&
        (document.body.innerText || '').trim().length > 50,
    );

  if (await adaAplikasi()) return;

  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await tungguDataTiba(page);

  if (await adaAplikasi()) return;

  const judul = await page.title();
  throw new Error(
    `Yang terbuka di ${path} bukan halaman aplikasi (judul: "${judul}"). ` +
      'Server dev kemungkinan tak menjawab -- tak ada yang diukur, dan uji ini ' +
      'sengaja berhenti daripada melaporkan temuan dari halaman galat peramban.',
  );
}

async function tungguNavbarTenang(page: Page): Promise<void> {
  const tombolMasuk = page.getByRole('button', { name: /masuk via sso/i });
  try {
    await tombolMasuk.waitFor({ state: 'detached', timeout: 3_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await tungguDataTiba(page);
  }
  try {
    await tombolMasuk.waitFor({ state: 'detached', timeout: 10_000 });
  } catch {
    const keadaan = await page.evaluate(() => {
      const baca = (k: string) => {
        try {
          return localStorage.getItem(k) ? 'ada' : 'kosong';
        } catch {
          return 'diblokir';
        }
      };
      return {
        lsToken: baca('token'),
        lsRole: baca('role'),
        kuki: document.cookie.replace(/=[^;]*/g, '=…'),
      };
    });
    throw new Error(
      'Navbar masih menampilkan tombol masuk sesudah 10 detik. ' +
        `localStorage token=${keadaan.lsToken} role=${keadaan.lsRole}; cookie: ${keadaan.kuki}`,
    );
  }
}

export interface Contoh {
  tiketOpd?: string;
  tiketKab?: string;
  tiketResponden?: string;
  surveiKab?: number;
  surveiDraf?: number;
  auditId?: number;
}

export async function ambilContoh(): Promise<Contoh> {
  const token = bacaToken();
  const contoh: Contoh = {};
  const api = await request.newContext({
    baseURL: process.env.E2E_ORIGIN ?? 'http://skema.local',
  });
  const ambil = async (path: string, tok?: string) => {
    if (!tok) return undefined;
    const res = await api.get(path, { headers: { Authorization: `Bearer ${tok}` } });
    return res.ok() ? (await res.json()).data : undefined;
  };
  try {
    contoh.tiketOpd = (await ambil('/api/v1/complaints?limit=1', token.opd))?.[0]?.ticketNo;
    contoh.tiketKab = (await ambil('/api/v1/complaints?limit=1', token.kabupaten))?.[0]?.ticketNo;
    contoh.tiketResponden = (await ambil('/api/v1/complaints?limit=1', token.responden))?.[0]
      ?.ticketNo;

    // Satu permintaan untuk dua kebutuhan. Survei DRAF dicari di antaranya,
    // bukan lewat `?status=draf`: pada basis data yang sama sekali tak punya
    // draf, penyaring itu mengembalikan daftar kosong yang tak dapat dibedakan
    // dari kegagalan permintaan.
    const survei: Array<{ id: number; status?: string }> =
      (await ambil('/api/v1/surveys?limit=50', token.kabupaten)) ?? [];
    contoh.surveiKab = survei[0]?.id;
    contoh.surveiDraf = survei.find((s) => (s.status ?? '').toLowerCase() === 'draf')?.id;

    contoh.auditId = (await ambil('/api/v1/audit-logs?limit=1', token.kabupaten))?.[0]?.id;
  } finally {
    await api.dispose();
  }
  return contoh;
}

interface FixtureResponsif {
  /** Memasang sesi peran tertentu, lalu membuka alamat yang diminta. */
  bukaSebagai: (peran: Peran, path: string) => Promise<void>;
}

export const test = base.extend<FixtureResponsif>({
  /**
   * SELURUH permintaan menulis diblokir sebelum meninggalkan peramban.
   *
   * Suite ini membuka modal konfirmasi hapus, ubah status, dan teruskan OPD di
   * atas basis data SUNGGUHAN milik tim -- data nyata itu justru yang merusak
   * tata letak (nama OPD panjang, nomor tiket tanpa spasi), sehingga mengukur
   * di atas data seed akan melewatkan cacatnya. Penjagaannya karena itu tak
   * boleh berupa kehati-hatian: `route.abort()` membuat tombol "Hapus" yang
   * tertekan tanpa sengaja secara fisik tak dapat mencapai server.
   */
  bukaSebagai: async ({ page, context }, use) => {
    let dicegat = 0;

    await page.route('**/api/v1/**', async (route) => {
      const metode = route.request().method();
      if (metode === 'GET' || metode === 'HEAD' || metode === 'OPTIONS') {
        await route.continue();
        return;
      }
      dicegat += 1;
      await route.abort('blockedbyclient');
    });

    // Penghitung permintaan dipasang di dalam halaman supaya `tungguDataTiba`
    // tahu kapan datanya benar-benar tiba, tanpa bergantung pada rangka
    // pemuatan maupun kelas animasi -- keduanya sudah pernah menipu pengukuran.
    await context.addInitScript(() => {
      const w = window as unknown as {
        __apiBerjalan: number;
        __apiTerakhir: number;
        __apiSelesai: number;
      };
      w.__apiBerjalan = 0;
      w.__apiSelesai = 0;
      w.__apiTerakhir = Date.now();
      const asli = window.fetch;
      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const alamat = String(args[0]);
        const dilacak = alamat.includes('/api/v1/');
        if (dilacak) w.__apiBerjalan += 1;
        try {
          return await asli.apply(window, args);
        } finally {
          if (dilacak) {
            w.__apiBerjalan -= 1;
            w.__apiSelesai += 1;
            w.__apiTerakhir = Date.now();
          }
        }
      };
      const bukaXHR = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (...args: unknown[]) {
        const alamat = String(args[1]);
        if (alamat.includes('/api/v1/')) {
          w.__apiBerjalan += 1;
          this.addEventListener('loadend', () => {
            w.__apiBerjalan -= 1;
            w.__apiSelesai += 1;
            w.__apiTerakhir = Date.now();
          });
        }
        return (bukaXHR as (...a: unknown[]) => void).apply(this, args);
      };
    });

    await use(async (peran, path) => {
      const token = bacaToken()[peran];
      test.skip(
        !token,
        `Tidak ada sesi untuk peran ${peran}. Jalankan dengan E2E_IDENTIFIER=<email akun uji>.`,
      );

      await context.addCookies([
        { name: 'token', value: token, domain: 'skema.local', path: '/' },
        { name: 'role', value: peran, domain: 'skema.local', path: '/' },
        { name: 'consent', value: '1', domain: 'skema.local', path: '/' },
      ]);
      await context.addInitScript(
        ([p, t]) => {
          try {
            localStorage.setItem('token', t);
            localStorage.setItem('role', p);
            localStorage.setItem('consent', '1');
          } catch {
            /* penyimpanan diblokir: cookie saja sudah cukup bagi proxy */
          }
        },
        [peran, token],
      );

      // `domcontentloaded`, bukan `load` bawaan: server dev Next mengompilasi
      // halaman saat pertama diminta, dan menunggu SELURUH sumber daya selesai
      // membuat pemuatan pertama tiap rute melewati batas waktu tanpa ada yang
      // rusak. Kesiapan datanya dijaga `tungguDataTiba` di bawah, yang memang
      // mengukur permintaan API, bukan sumber daya halaman.
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await tungguDataTiba(page);
      await pastikanHalamanAplikasi(page, path);
      await tungguNavbarTenang(page);
    });

    // Dilaporkan sesudah uji selesai supaya angkanya terlihat di keluaran,
    // bukan hanya dipercaya.
    if (dicegat > 0) {
      console.log(`  [penjaga] ${dicegat} permintaan menulis dicegat sebelum mencapai server`);
    }
  },
});

export { expect };
