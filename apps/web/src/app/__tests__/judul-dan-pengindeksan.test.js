import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import robots from '../robots';
import sitemap from '../sitemap';

/**
 * JUDUL HALAMAN & PENGINDEKSAN (25 September 2026).
 *
 * Dua hal yang tampak berjauhan tetapi berasal dari satu pendataan yang sama:
 * 34 dari 44 halaman tak punya judul sendiri, dan tak ada robots.txt maupun
 * sitemap sama sekali.
 *
 * JUDUL ADALAH SOAL AKSESIBILITAS, bukan sekadar SEO. Judul halaman adalah
 * penanda lokasi utama bagi pembaca layar: ia diumumkan setiap kali pengguna
 * pindah halaman. Dengan 34 halaman bertajuk sama, pengguna tunanetra tak
 * pernah diberi tahu mereka sedang di mana.
 *
 * KENDALA NEXT YANG MENENTUKAN BENTUK PERBAIKANNYA: komponen klien tak boleh
 * mengekspor `metadata`, dan 34 halaman itu seluruhnya komponen klien.
 * Alternatif merender `<title>` langsung dari komponen klien SUDAH DICOBA di
 * peramban sungguhan dan GAGAL: `document.title` tetap memakai judul dari root
 * layout, dan halamannya berakhir dengan tiga tag `<title>`. Karena itu tiap
 * halaman diberi `layout.jsx` di direktorinya sendiri -- layout boleh menjadi
 * komponen server walau halamannya tidak.
 *
 * ATURAN YANG DITEGAKKAN DI SINI: judul harus berasal dari direktori halaman
 * ITU SENDIRI, bukan diwarisi leluhur. Bila warisan diterima, root layout yang
 * memang selalu punya metadata akan meloloskan semua halaman tanpa kecuali, dan
 * ujinya berhenti menguji apa pun.
 */
const AKAR_APP = join(__dirname, '..');

// Beranda dikecualikan dengan sengaja: ia MEMANG situsnya sendiri, jadi judul
// dari root layout ("SKEMA Madiun") sudah tepat dan judul tambahan justru
// mengulang.
const DIKECUALIKAN = ['page.jsx'];

function semuaHalaman(dir = AKAR_APP, hasil = []) {
  for (const isi of readdirSync(dir)) {
    const p = join(dir, isi);
    if (statSync(p).isDirectory()) {
      if (isi === '__tests__') continue;
      semuaHalaman(p, hasil);
    } else if (isi === 'page.jsx') {
      hasil.push(p);
    }
  }
  return hasil;
}

const punyaMetadata = (berkas) =>
  existsSync(berkas) && /export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(readFileSync(berkas, 'utf8'));

const halaman = semuaHalaman().filter(
  (p) => !DIKECUALIKAN.includes(relative(AKAR_APP, p).split(sep).join('/')),
);

describe('judul halaman', () => {
  it('menemukan halaman untuk diperiksa', () => {
    // Penjaga premis: bila penelusurannya rusak dan menghasilkan daftar kosong,
    // seluruh kasus di bawah lulus tanpa memeriksa apa pun.
    expect(halaman.length).toBeGreaterThan(30);
  });

  it.each(halaman.map((p) => [relative(AKAR_APP, p).split(sep).join('/'), p]))(
    '%s punya judulnya sendiri',
    (_nama, berkas) => {
      const sendiri = punyaMetadata(berkas);
      const lewatLayout = punyaMetadata(join(berkas, '..', 'layout.jsx'));

      expect(sendiri || lewatLayout).toBe(true);
    },
  );
});

describe('robots.txt', () => {
  const aturan = () => {
    const r = robots();
    return Array.isArray(r.rules) ? r.rules[0] : r.rules;
  };

  const daftar = (nilai) => (Array.isArray(nilai) ? nilai : [nilai]);

  /**
   * Meniru cara perayap mencocokkan robots.txt, BUKAN memeriksa ejaan daftarnya.
   *
   * Versi pertama uji ini memeriksa ejaan, dan versi pertama implementasinya
   * lolos dari lubang yang serius: `allow` memuat `/`, dan di robots.txt pola
   * dicocokkan sebagai AWALAN, sehingga `Allow: /` mengizinkan seluruh situs
   * dan membatalkan `Disallow: /` seluruhnya. Uji yang memeriksa ejaan tak
   * dapat melihat itu; uji yang mencocokkan seperti perayap langsung melihatnya.
   *
   * Aturannya mengikuti yang dipakai Google dan Bing: pola terpanjang yang
   * cocok menang, seri dimenangkan `allow`, dan akhiran `$` berarti cocok
   * persis alih-alih sebagai awalan.
   */
  const boleh = (jalur) => {
    const a = aturan();
    const cocok = (pola) =>
      pola.endsWith('$') ? jalur === pola.slice(0, -1) : jalur.startsWith(pola);
    const terpanjang = (daf) =>
      daftar(daf)
        .filter(cocok)
        .reduce((a2, b) => (b.length > a2.length ? b : a2), '');

    const izin = terpanjang(a.allow);
    const larang = terpanjang(a.disallow);
    if (!izin && !larang) return true;
    return izin.length >= larang.length;
  };

  it.each(['/', '/about', '/statistics', '/kebijakan-privasi'])(
    'mengizinkan halaman publik %s',
    (jalur) => {
      expect(boleh(jalur)).toBe(true);
    },
  );

  it.each([
    '/complaints',
    '/complaints/12',
    '/dashboard',
    '/profile',
    '/notifications',
    '/admin-kab/users',
    '/admin-opd/complaints/3',
    '/persetujuan',
  ])('melarang area privat %s', (jalur) => {
    expect(boleh(jalur)).toBe(false);
  });

  it('tidak mengizinkan anak halaman publik ikut terbuka', () => {
    // `Allow: /about` tanpa jangkar juga mengizinkan `/about-rahasia` dan
    // seluruh anaknya. Jangkarnya yang menahan itu.
    expect(boleh('/about/rahasia')).toBe(false);
    expect(boleh('/statistics/ekspor')).toBe(false);
  });

  it('menolak secara baku, bukan mengizinkan secara baku', () => {
    // Dengan izinkan-dulu, tiap halaman PRIVAT baru dapat dirayapi sampai ada
    // yang ingat melarangnya. Dengan tolak-dulu, yang terlupakan hanyalah
    // halaman publik baru menjadi tak terlihat. Untuk sistem yang menyimpan
    // pengaduan warga, kelalaian jenis kedua jauh lebih murah.
    expect(daftar(aturan().disallow)).toContain('/');
  });

  it('menunjuk ke sitemap-nya', () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe('sitemap', () => {
  const jalur = () => sitemap().map((e) => new URL(e.url).pathname);

  it('memuat keempat halaman publik', () => {
    expect(jalur().sort()).toEqual(['/', '/about', '/kebijakan-privasi', '/statistics']);
  });

  it('TIDAK memuat satu pun rute privat', () => {
    // Penegasan terpenting berkas ini. Sitemap yang bocor tidak sekadar lalai,
    // ia MENGUMUMKAN alamat yang justru ingin disembunyikan -- lengkap, rapi,
    // dan dalam bentuk yang paling mudah dibaca mesin.
    const privat = /^\/(complaints|dashboard|profile|notifications|surveys|admin-kab|admin-opd|persetujuan|pilih-peran|sso|isi|survei)/;

    expect(jalur().filter((p) => privat.test(p))).toEqual([]);
  });

  it('memakai URL absolut', () => {
    for (const e of sitemap()) {
      expect(e.url).toMatch(/^https?:\/\//);
    }
  });
});
