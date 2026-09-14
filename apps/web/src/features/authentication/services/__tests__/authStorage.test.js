import { clearSession, isAuthenticated, saveSession, saveSsoSession } from '../authStorage';

/**
 * SESI HANTU (laporan pengguna 8 September 2026).
 *
 * Gejalanya: "meskipun kondisi belum login tetapi data opd dan kategori
 * pengaduan tetap terlihat". Diukur dengan Chrome pada konteks nol cookie,
 * beranda TIDAK membocorkan apa pun — kedua panggilan API menjawab 401. Jadi
 * yang terjadi bukan kebocoran endpoint: sesinya memang masih hidup.
 *
 * SEBABNYA: pada jalur SSO tokennya ada di cookie `session` HttpOnly milik
 * backend, dan `clearSession()` berjalan di JavaScript — yang TIDAK DAPAT
 * menghapus cookie HttpOnly. Begitu `localStorage` hilang tanpa logout
 * (dibersihkan tangan, "clear site data" yang menyisakan cookie, atau
 * interceptor 401 di api.js), antarmuka menyatakan sesi mati sementara cookienya
 * masih sah: setiap panggilan API tetap 200, dan dropdown OPD pun terisi.
 *
 * Arahnya sengaja CONDONG KE LOGOUT: bila `sso_expires_at` hilang padahal sesi
 * sah, pengguna diminta masuk lagi. Di sistem pengaduan dengan gerbang UU PDP,
 * salah ke arah "keluar" jauh lebih murah daripada seseorang menyangka dirinya
 * anonim padahal aplikasi masih dapat bertindak sebagai dirinya — di komputer
 * bersama itu masalah nyata.
 */
const URL_LOGOUT = /\/auth\/logout$/;

const panggilanLogout = () =>
  (global.fetch.mock.calls ?? []).filter(([url]) => URL_LOGOUT.test(String(url)));

beforeEach(() => {
  localStorage.clear();
  // Cookie non-HttpOnly saja yang terlihat di sini; cookie `session` justru
  // TIDAK dapat disimulasikan jsdom, dan itu inti masalahnya.
  document.cookie.split(';').forEach((c) => {
    const nama = c.split('=')[0].trim();
    if (nama) document.cookie = `${nama}=; path=/; max-age=0`;
  });
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

describe('clearSession mematikan sesi di SERVER, bukan cuma di peramban', () => {
  it('menembakkan POST ke /auth/logout', () => {
    clearSession();

    expect(panggilanLogout()).toHaveLength(1);
    const [, opsi] = panggilanLogout()[0];
    expect(opsi.method).toBe('POST');
  });

  it('mengirim cookie — tanpa itu backend tak tahu sesi mana yang dimatikan', () => {
    clearSession();

    const [, opsi] = panggilanLogout()[0];
    // `credentials: 'include'` WAJIB: frontend dan API beda origin, dan cookie
    // `session` tak ikut terkirim pada permintaan lintas-origin kecuali diminta.
    expect(opsi.credentials).toBe('include');
  });

  it('memakai keepalive supaya tetap terkirim walau halamannya langsung pindah', () => {
    clearSession();

    const [, opsi] = panggilanLogout()[0];
    // Beberapa pemanggil `clearSession()` segera menavigasi. Tanpa `keepalive`,
    // permintaannya dibatalkan peramban dan sesi server tetap hidup —
    // memulihkan bug yang sedang ditutup ini.
    expect(opsi.keepalive).toBe(true);
  });

  it('TIDAK melempar walau jaringannya mati', () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    // Membersihkan sesi lokal tak boleh gagal gara-gara jaringan: kalau ia
    // melempar, artefak lokalnya tetap ada dan pengguna terjebak "setengah
    // login" — keadaan yang lebih buruk daripada keadaan awalnya.
    expect(() => clearSession()).not.toThrow();
  });

  it('tetap membersihkan artefak lokal', () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('role', 'responden');

    clearSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });
});

describe('isAuthenticated pada sesi SSO yang kedaluwarsa', () => {
  it('menyatakan tidak masuk DAN mematikan sesi server (inti sesi hantu)', () => {
    // Sesi SSO yang waktunya sudah lewat: inilah keadaan yang dulu meninggalkan
    // cookie `session` hidup sementara antarmuka menyatakan logout.
    saveSsoSession('responden', Math.floor(Date.now() / 1000) - 60, false);
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    expect(isAuthenticated()).toBe(false);
    expect(panggilanLogout()).toHaveLength(1);
  });
});

/**
 * Laporan pengguna 14 September 2026: akun warga ber-peran banyak yang belum
 * menyetujui PDP tetap dipantulkan dari /persetujuan.
 *
 * Backend melaporkan `consentRequired: false` selama peran BELUM dipilih --
 * lihat AuthService.getRoles & getMe, yang keduanya memakai
 * `actingRole ? isRequired(...) : false`. Nilai itu berarti "belum dapat
 * ditentukan", BUKAN "sudah menyetujui". Menulisnya sebagai penanda "sudah
 * setuju" membukakan seluruh area warga bagi orang yang belum pernah melihat
 * gerbangnya, dan sekaligus memantulkannya dari satu-satunya halaman yang
 * dapat memperbaiki keadaan itu.
 *
 * Ini lapis kedua: `setActingRole` sudah mengoreksi penanda begitu perannya
 * dipilih, tetapi jendela sebelum pilihan itu tak boleh dibuka lebar.
 */
const b64urlPenanda = (o) =>
  Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const tokenPenanda = () =>
  `${b64urlPenanda({ alg: 'HS256', typ: 'JWT' })}.${b64urlPenanda({
    sub: '21',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.uji`;

describe('penanda persetujuan tidak mendahului pilihan peran', () => {
  const detikDepan = () => Math.floor(Date.now() / 1000) + 3600;

  it('dev-login akun ber-peran banyak TIDAK mengaku sudah menyetujui', () => {
    saveSession(tokenPenanda(), null, false);

    expect(localStorage.getItem('consent')).toBe('0');
  });

  it('SSO akun ber-peran banyak juga tidak', () => {
    saveSsoSession(null, detikDepan(), false);

    expect(localStorage.getItem('consent')).toBe('0');
  });

  /**
   * Pasangan yang membuat kedua uji di atas berarti: peran TUNGGAL memang sudah
   * dapat ditentukan, jadi jawabannya dipercaya apa adanya. Tanpa pasangan ini,
   * "selalu 0" pun akan lolos.
   */
  it('peran tunggal yang sudah menyetujui tetap ditandai beres', () => {
    saveSession(tokenPenanda(), 'responden', false);

    expect(localStorage.getItem('consent')).toBe('1');
  });

  it('peran tunggal yang belum menyetujui ditandai belum', () => {
    saveSession(tokenPenanda(), 'responden', true);

    expect(localStorage.getItem('consent')).toBe('0');
  });

  it('admin ber-peran tunggal tetap ditandai beres', () => {
    saveSsoSession('kabupaten', detikDepan(), false);

    expect(localStorage.getItem('consent')).toBe('1');
  });
});
