import {
  saveSession,
  saveSsoSession,
  saveConsentFlag,
  clearSession,
  isAuthenticated,
  selaraskanCookieSesi,
} from '../authStorage';

/**
 * TC-FE-032 — Cookie sesi bertahan sesudah peramban ditutup.
 *
 * MENGUNCI [BUG-006](../../../../../../docs/BUG_REPORTS.md#bug-006) yang sudah
 * diperbaiki. Cacatnya: cookie `token`/`role` ditulis sebagai **cookie sesi**
 * (tanpa `max-age`), sehingga hilang setiap kali peramban ditutup — sementara
 * token di localStorage tetap hidup. Hasilnya "sesi hantu": antarmuka mengaku
 * sudah masuk, tombol-tombolnya berfungsi, tetapi proxy.js tak melihat cookie
 * apa pun dan memantulkan setiap halaman terlindung ke beranda publik.
 *
 * Ada DUA arah yang harus dijaga, dan keduanya pernah rusak:
 *   1. cookie mati lebih cepat daripada token → sesi hantu (BUG-006);
 *   2. cookie hidup lebih lama daripada token → proxy membukakan halaman yang
 *      seluruh panggilan API-nya sudah pasti 401, sama membingungkannya.
 *
 * Karena itu yang diuji bukan "ada cookie", melainkan **umurnya berasal dari
 * `exp` token itu sendiri**.
 */

/** JWT palsu — hanya bagian payload yang dibaca `decodeJwtPayload`. */
const buatToken = (expDetik) => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 1, exp: expDetik })}.tandatangan`;
};

const detikSekarang = () => Math.floor(Date.now() / 1000);

const bacaCookie = (nama) => {
  const bagian = document.cookie.split('; ').find((c) => c.startsWith(`${nama}=`));
  return bagian ? bagian.slice(nama.length + 1) : null;
};

/**
 * jsdom TIDAK menerapkan `max-age`: ia menyimpan nilainya lalu melupakan
 * atributnya, jadi `document.cookie` tak pernah bisa membuktikan cookienya
 * bermasa hidup. Setter-nya karena itu diintip di sini — string yang DITULIS
 * aplikasi itulah satu-satunya bukti yang tersedia, dan justru string itulah
 * yang dikirim ke peramban sungguhan.
 */
let cookieDitulis = [];
let cookieAsli;

beforeAll(() => {
  cookieAsli = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieAsli.get.call(document),
    set: (nilai) => {
      cookieDitulis.push(nilai);
      cookieAsli.set.call(document, nilai);
    },
  });
});

afterAll(() => {
  delete document.cookie;
  Object.defineProperty(Document.prototype, 'cookie', cookieAsli);
});

beforeEach(() => {
  localStorage.clear();
  cookieDitulis = [];
  for (const nama of ['token', 'role', 'area', 'opd', 'consent']) {
    document.cookie = `${nama}=; path=/; max-age=0`;
  }
  cookieDitulis = [];
});

/** Nilai `max-age` yang benar-benar dituliskan untuk sebuah cookie. */
const maxAgeDitulis = (nama) => {
  const baris = [...cookieDitulis].reverse().find((c) => c.startsWith(`${nama}=`));
  if (!baris) return null;
  const cocok = baris.match(/max-age=(-?\d+)/);
  return cocok ? Number(cocok[1]) : null;
};

describe('saveSession — umur cookie mengikuti `exp` token (TC-FE-032)', () => {
  it('memberi cookie token & role masa hidup, bukan cookie sesi', () => {
    const exp = detikSekarang() + 3600;
    saveSession(buatToken(exp), 'kabupaten');

    // Inilah BUG-006: tanpa `max-age`, keduanya mati saat peramban ditutup.
    expect(maxAgeDitulis('token')).not.toBeNull();
    expect(maxAgeDitulis('role')).not.toBeNull();
  });

  it('menyamakan umur cookie dengan sisa umur token, bukan angka tetap', () => {
    const exp = detikSekarang() + 3600;
    saveSession(buatToken(exp), 'kabupaten');

    // Toleransi 5 detik: perhitungannya memakai `Date.now()` dua kali.
    expect(maxAgeDitulis('token')).toBeGreaterThan(3595);
    expect(maxAgeDitulis('token')).toBeLessThanOrEqual(3600);
    // `role` harus mati BERSAMAAN dengan `token`. Kalau ia hidup lebih lama,
    // proxy melihat peran tanpa sesi; kalau lebih pendek, sesi tanpa peran —
    // dan admin dipantulkan dari areanya sendiri.
    expect(maxAgeDitulis('role')).toBe(maxAgeDitulis('token'));
  });

  it('memakai umur cadangan ketika token tak punya klaim `exp`', () => {
    saveSession(buatToken(undefined), 'opd');

    // Tak boleh 0 (mati seketika) dan tak boleh tanpa max-age (cookie sesi).
    expect(maxAgeDitulis('token')).toBeGreaterThan(0);
  });

  it('memberi cookie umur 0 untuk token yang sudah kedaluwarsa', () => {
    saveSession(buatToken(detikSekarang() - 60), 'opd');

    // Bukan angka negatif dan bukan umur cadangan: token mati tak boleh
    // menghasilkan cookie yang hidup satu detik pun.
    expect(maxAgeDitulis('token')).toBe(0);
  });

  it('menandai warga yang belum menyetujui dengan consent=0', () => {
    saveSession(buatToken(detikSekarang() + 3600), 'responden', true);
    expect(bacaCookie('consent')).toBe('0');

    saveSession(buatToken(detikSekarang() + 3600), 'responden', false);
    expect(bacaCookie('consent')).toBe('1');
  });
});

describe('saveSsoSession — jalur tanpa token (TC-FE-032)', () => {
  it('memberi cookie `role` masa hidup dari `expiresAt`, bukan cookie sesi', () => {
    // Cookie `session` milik backend BERTAHAN karena punya Max-Age sendiri;
    // kalau cookie `role` di sini mati saat peramban ditutup, proxy melihat
    // sesi hidup TANPA peran dan memantulkan admin dari areanya sendiri.
    saveSsoSession('kabupaten', detikSekarang() + 7200);

    expect(maxAgeDitulis('role')).toBeGreaterThan(7195);
    expect(maxAgeDitulis('role')).toBeLessThanOrEqual(7200);
  });
});

describe('isAuthenticated — dua arah keadaan setengah login (TC-FE-032)', () => {
  it('menganggap sesi hidup selama token belum kedaluwarsa', () => {
    saveSession(buatToken(detikSekarang() + 3600), 'kabupaten');
    expect(isAuthenticated()).toBe(true);
  });

  it('membuang token kedaluwarsa beserta cookienya, bukan sekadar menjawab false', () => {
    // Membiarkan cookienya berarti proxy tetap membukakan halaman /admin-*
    // padahal seluruh panggilan API-nya sudah pasti 401.
    saveSession(buatToken(detikSekarang() - 60), 'kabupaten');

    expect(isAuthenticated()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(bacaCookie('token')).toBeNull();
    expect(bacaCookie('role')).toBeNull();
  });

  it('memulihkan cookie yang hilang selagi tokennya masih sah', () => {
    // Peramban yang cookienya terhapus tangan (atau warisan versi lama) harus
    // sembuh sendiri; tanpa ini UI bilang sudah masuk sementara proxy
    // memantulkan setiap halaman terlindung.
    saveSession(buatToken(detikSekarang() + 3600), 'kabupaten');
    document.cookie = 'token=; path=/; max-age=0';
    expect(bacaCookie('token')).toBeNull();

    expect(isAuthenticated()).toBe(true);
    expect(bacaCookie('token')).not.toBeNull();
    expect(bacaCookie('role')).toBe('kabupaten');
  });
});

describe('clearSession — tak meninggalkan warisan bagi pengguna berikutnya (TC-FE-032)', () => {
  it('membuang seluruh cookie navigasi, termasuk penanda persetujuan', () => {
    saveSession(buatToken(detikSekarang() + 3600), 'responden', false);
    saveConsentFlag(true);
    expect(bacaCookie('consent')).toBe('1');

    clearSession();

    for (const nama of ['token', 'role', 'area', 'opd', 'consent']) {
      expect(bacaCookie(nama)).toBeNull();
    }
  });

  it('membuang cerminan localStorage sehingga persetujuan tak dapat dipulihkan', () => {
    // Kalau cerminannya tertinggal, `selaraskanCookieSesi()` akan menuliskan
    // kembali persetujuan milik warga SEBELUMNYA di peramban yang sama —
    // gerbang PDP terlewati atas nama orang lain.
    saveSession(buatToken(detikSekarang() + 3600), 'responden', false);
    clearSession();

    selaraskanCookieSesi();

    expect(localStorage.getItem('consent')).toBeNull();
    expect(bacaCookie('consent')).toBeNull();
  });

  it('memberi tahu pendengar sesudah seluruh artefak benar-benar hilang', () => {
    saveSession(buatToken(detikSekarang() + 3600), 'kabupaten');
    let sesiSaatDiberitahu = 'belum dipanggil';
    const pendengar = () => {
      sesiSaatDiberitahu = localStorage.getItem('token');
    };
    window.addEventListener('skema:sesi-berubah', pendengar);

    clearSession();

    // Pendengar yang memanggil isAuthenticated() harus membaca keadaan yang
    // sudah bersih — bukan setengah bersih.
    expect(sesiSaatDiberitahu).toBeNull();
    window.removeEventListener('skema:sesi-berubah', pendengar);
  });
});
