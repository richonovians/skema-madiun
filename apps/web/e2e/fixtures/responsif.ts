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
export interface Contoh {
  tiketOpd?: string;
  surveiKab?: number;
}

export async function ambilContoh(): Promise<Contoh> {
  const token = bacaToken();
  const contoh: Contoh = {};
  const api = await request.newContext({
    baseURL: process.env.E2E_ORIGIN ?? 'http://skema.local',
  });
  try {
    if (token.opd) {
      const res = await api.get('/api/v1/complaints?limit=1', {
        headers: { Authorization: `Bearer ${token.opd}` },
      });
      if (res.ok()) contoh.tiketOpd = (await res.json()).data?.[0]?.ticketNo;
    }
    if (token.kabupaten) {
      const res = await api.get('/api/v1/surveys?limit=1', {
        headers: { Authorization: `Bearer ${token.kabupaten}` },
      });
      if (res.ok()) contoh.surveiKab = (await res.json()).data?.[0]?.id;
    }
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
    });

    // Dilaporkan sesudah uji selesai supaya angkanya terlihat di keluaran,
    // bukan hanya dipercaya.
    if (dicegat > 0) {
      console.log(`  [penjaga] ${dicegat} permintaan menulis dicegat sebelum mencapai server`);
    }
  },
});

export { expect };
