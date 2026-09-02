// Penyimpanan token sesi. Disimpan di DUA tempat dengan alasan berbeda:
// - localStorage: dibaca interceptor axios (api.js) untuk header Authorization di client.
// - cookie: dibaca proxy.js (jalan di server/edge, tak bisa akses localStorage) untuk proteksi route.
const TOKEN_KEY = 'token';
// `role` (2026-08-05): SEBELUMNYA hanya token yang disimpan -- proxy.js tak
// bisa membedakan peran sama sekali, sehingga Responden bisa membuka
// /admin-kab & /admin-opd (halaman terbuka, walau API-nya tetap 403 di
// backend). Disimpan cookie TERPISAH dari token, bukan didekode dari JWT,
// karena proxy.js Edge Runtime tak boleh bergantung pada isi klaim token.
const ROLE_KEY = 'role';
// Area kerja yang DIPILIH superuser saat login (2026-08-20): 'kabupaten' | 'opd'
// | 'responden'. Sama seperti `role`, disimpan sebagai cookie terpisah karena
// yang membacanya adalah proxy.js di edge/server.
//
// JUJUR soal sifatnya: ini PEMBATAS NAVIGASI, bukan pembatas hak. Backend
// memperlakukan superuser setara kabupaten di seluruh pemeriksaan akses
// (`hasFullAccess` di role.util.ts), jadi memilih "Warga" tidak mengurangi apa
// pun yang boleh dilakukan token-nya -- yang berubah adalah halaman mana yang
// dibukakan untuknya. Cookie ini bisa disunting sendiri oleh pemiliknya di
// peramban, dan itu memang tak menaikkan hak siapa pun: hanya superuser yang
// punya sesi superuser.
const AREA_KEY = 'area';
// OPD yang sedang "diperankan" superuser saat memakai area OPD (2026-08-20):
// `{ id, nama }` sebagai JSON. Hanya localStorage, TANPA cookie -- proxy tak
// membutuhkannya (kurungan areanya sudah ditentukan cookie `area`), dan yang
// memakainya hanya halaman area OPD di sisi klien untuk menyaring daftar
// (`?opdId=`) serta menentukan OPD tujuan saat membuat survei.
//
// Sama seperti `area`: ini mempersempit TAMPILAN, bukan hak akses. Backend
// meng-AND-kan `opdId` dengan penyaring kepemilikan, jadi parameter ini tak
// pernah bisa melebarkan apa pun.
const ACTING_OPD_KEY = 'acting_opd';
// ...KECUALI satu hal yang memang perlu dibaca proxy: ADA-TIDAKNYA OPD terpilih
// menentukan boleh-tidaknya superuser membuka /admin-opd/dashboard (2026-08-20).
// Karena itu ID-nya (bukan seluruh objek) ikut disimpan sebagai cookie -- proxy
// jalan di edge dan tak bisa menyentuh localStorage. Nama OPD sengaja TIDAK
// dimasukkan cookie: proxy tak membutuhkannya, dan cookie ikut terkirim pada
// setiap permintaan.
const ACTING_OPD_COOKIE = 'opd';
// Waktu kedaluwarsa sesi SSO (2026-08-27), detik epoch. HANYA untuk jalur SSO.
//
// Kenapa perlu disimpan sendiri: pada jalur SSO tokennya ada di cookie `session`
// HttpOnly milik backend, sehingga JavaScript TAK BISA membacanya -- termasuk tak
// bisa mendekode klaim `exp`-nya seperti yang dilakukan `isTokenExpired()` di
// bawah untuk jalur dev-login. Tanpa nilai ini, antarmuka akan menampilkan
// keadaan "sudah masuk" tanpa batas waktu sampai panggilan API pertama gagal 401
// -- tepat keluhan 18 Agu 2026 ("baru akses localhost sudah terlihat login").
//
// Nilainya diberikan backend lewat fragment `#expires=` pada alamat callback. Itu
// bukan rahasia: hanya sebuah waktu, tak memberi kemampuan apa pun. Yang rahasia
// (tokennya) justru tidak pernah lagi melewati URL.
const SSO_EXPIRES_KEY = 'sso_expires_at';
// Persetujuan UU PDP (2026-08-27): '1' = sudah, '0' = belum. Cookie, bukan
// localStorage, karena yang membacanya proxy.js di edge/server untuk memantulkan
// warga yang belum menyetujui ke /persetujuan.
//
// Sifatnya perlu dinyatakan terus terang, sama seperti `role` & `area`: ini
// pembatas NAVIGASI. Nilainya bisa disunting pemiliknya sendiri di peramban, dan
// itu tak melewati apa pun -- backend menolak 403 di titik pengumpulan datanya
// sendiri (ConsentService.assertConsented pada POST /complaints &
// POST /surveys/:id/responses), jadi menyunting cookie ini hanya menghasilkan
// halaman yang gagal mengirim, bukan pengiriman tanpa persetujuan.
const CONSENT_KEY = 'consent';
// Event yang ditembakkan clearSession() (2026-08-28).
//
// Sebelum ini TAK ADA satu pun jalur yang memberi tahu antarmuka bahwa sesinya
// baru saja dinyatakan tak sah. Navbar menghitung `isLoggedIn` sekali saat mount
// lewat isAuthenticated(), lalu tak pernah menghitungnya lagi. Ketika
// interceptor 401 di api.js membuang seluruh artefak sesi, navbar tetap
// menampilkan menu akun -- dan karena profilnya juga gagal dimuat, isinya cuma
// "?" yang kembali di SETIAP refresh. Satu-satunya cara membersihkannya adalah
// menekan Logout sendiri (keluhan pengguna 28 Agustus 2026).
//
// Event DOM biasa, bukan store: tak ada keadaan baru yang perlu disimpan --
// sumber kebenarannya tetap isAuthenticated(). Yang dibutuhkan hanyalah aba-aba
// "hitung ulang" bagi komponen yang sedang terpasang.
export const SESSION_CHANGED_EVENT = 'skema:sesi-berubah';

/**
 * @param {string} token token sesi (jalur dev-login)
 * @param {string} role peran backend
 * @param {boolean} [consentRequired] dari `user.consentRequired` respons login;
 *   dibiarkan undefined = anggap sudah menyetujui (peran non-warga selalu begitu)
 */
export function saveSession(token, role, consentRequired) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('sso_logged_in', 'true');
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    document.cookie = `${ROLE_KEY}=${role}; path=/; SameSite=Lax`;
  }
  saveConsentFlag(!consentRequired);
}

/** Tulis penanda persetujuan yang dibaca proxy.js. */
export function saveConsentFlag(sudahMenyetujui) {
  if (typeof window === 'undefined') return;
  document.cookie = `${CONSENT_KEY}=${sudahMenyetujui ? '1' : '0'}; path=/; SameSite=Lax`;
}

/**
 * Simpan sesi hasil login SSO Helpdesk (2026-08-27).
 *
 * Beda dari `saveSession()` di atas dalam satu hal yang menentukan: TIDAK ADA
 * token untuk disimpan. Backend sudah menitipkannya sebagai cookie `session`
 * HttpOnly, jadi yang disimpan di sini hanyalah keterangan pendamping yang
 * dibutuhkan antarmuka & proxy:
 * - `role`  : cookie, dibaca proxy.js untuk menentukan area yang boleh dibuka.
 * - `expiresAt`: localStorage, supaya UI tahu kapan berhenti menampilkan
 *   keadaan "sudah masuk" (lihat catatan pada SSO_EXPIRES_KEY).
 *
 * Cookie `session` sendiri TIDAK disentuh dari sini dan memang tak bisa.
 *
 * @param {string} role peran backend ('kabupaten'|'opd'|'responden'|'superuser')
 * @param {number} expiresAt detik epoch; 0/NaN diabaikan
 * @param {boolean} [consentRequired] dari `GET /auth/me`
 */
export function saveSsoSession(role, expiresAt, consentRequired) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sso_logged_in', 'true');
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    localStorage.setItem(SSO_EXPIRES_KEY, String(expiresAt));
  }
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    document.cookie = `${ROLE_KEY}=${role}; path=/; SameSite=Lax`;
  }
  saveConsentFlag(!consentRequired);
}

/**
 * Buang seluruh artefak sesi SISI KLIEN.
 *
 * BATASAN YANG PERLU DINYATAKAN TERUS TERANG (2026-08-27): cookie `session`
 * HttpOnly dari jalur SSO TIDAK dapat dihapus dari sini -- hanya server yang
 * boleh menghapus cookie yang ia setel HttpOnly, dan justru itu gunanya. Yang
 * membuangnya adalah `POST /auth/logout`, dan karena itu ketiga pemanggil
 * (useLogout, ProfileActions, ProfileAvatarDropdown) selalu memanggil endpoint
 * itu LEBIH DULU. Cookie sesi juga memikul `Max-Age` sesuai masa berlaku
 * tokennya, jadi peramban menghapusnya sendiri saat kedaluwarsa -- tak ada sisa
 * yang menumpuk bila logout gagal.
 */
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(AREA_KEY);
  localStorage.removeItem(ACTING_OPD_KEY);
  localStorage.removeItem(SSO_EXPIRES_KEY);
  localStorage.setItem('sso_logged_in', 'false');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
  // Area ikut dibuang saat keluar -- kalau tidak, login berikutnya (bisa akun
  // lain di peramban yang sama) mewarisi pembatasan area milik sesi lama.
  document.cookie = `${AREA_KEY}=; path=/; max-age=0`;
  document.cookie = `${ACTING_OPD_COOKIE}=; path=/; max-age=0`;
  // Alasan yang sama untuk persetujuan: membiarkannya berarti warga BERIKUTNYA
  // di peramban ini melewati gerbang persetujuan atas nama persetujuan orang lain.
  document.cookie = `${CONSENT_KEY}=; path=/; max-age=0`;
  // Ditembakkan PALING AKHIR, setelah semua artefak benar-benar hilang, supaya
  // pendengar yang memanggil isAuthenticated() membaca keadaan yang sudah bersih.
  // Tak ada risiko berulang tanpa henti: satu-satunya pemanggil internal
  // clearSession() adalah isAuthenticated() saat token basi, dan token itu sudah
  // dibuang sebelum baris ini -- panggilan berikutnya tak lagi masuk cabang itu.
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

/** Simpan area kerja pilihan superuser (lihat RoleLoginPicker.jsx). */
export function saveSuperuserArea(area) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AREA_KEY, area);
  document.cookie = `${AREA_KEY}=${area}; path=/; SameSite=Lax`;
}

/**
 * Simpan OPD yang diperankan superuser di area OPD.
 * @param {{id: number, nama: string}|null} opd null = lupakan (lihat seluruh OPD).
 */
export function saveActingOpd(opd) {
  if (typeof window === 'undefined') return;
  if (!opd) {
    localStorage.removeItem(ACTING_OPD_KEY);
    document.cookie = `${ACTING_OPD_COOKIE}=; path=/; max-age=0`;
    return;
  }
  localStorage.setItem(ACTING_OPD_KEY, JSON.stringify({ id: opd.id, nama: opd.nama }));
  document.cookie = `${ACTING_OPD_COOKIE}=${opd.id}; path=/; SameSite=Lax`;
}

/**
 * OPD yang sedang diperankan; null bila tak ada atau isinya rusak.
 * @returns {{id: number, nama: string}|null}
 */
export function getActingOpd() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ACTING_OPD_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Dibaca dari localStorage yang bisa disunting/basi -- id yang bukan angka
    // akan menghasilkan `?opdId=NaN` dan 400 dari backend, jadi ditolak di sini.
    return typeof parsed?.id === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/** Area kerja yang sedang dipakai superuser; null bila belum memilih. */
export function getSuperuserArea() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AREA_KEY);
}

/** Lupakan pilihan area & OPD yang diperankan (saat superuser memilih ulang). */
export function clearSuperuserArea() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AREA_KEY);
  localStorage.removeItem(ACTING_OPD_KEY);
  document.cookie = `${AREA_KEY}=; path=/; max-age=0`;
  document.cookie = `${ACTING_OPD_COOKIE}=; path=/; max-age=0`;
}

/**
 * Baca payload JWT (segmen tengah, base64url) tanpa memverifikasi tanda tangan
 * -- verifikasi tetap tugas backend. Di sini cuma untuk tahu `exp`, supaya UI
 * tak menampilkan status login palsu.
 * @returns {object|null} null bila token cacat/tak bisa didekode.
 */
function decodeJwtPayload(token) {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    // `atob` menghasilkan deretan byte, bukan teks UTF-8 -- klaim non-ASCII
    // (mis. nama ber-aksen bila kelak ditambahkan backend) akan rusak/melempar
    // kalau langsung di-JSON.parse. Byte diubah ke persen-encoding dulu, cara
    // yang cuma butuh atob + decodeURIComponent (keduanya ada di browser MAUPUN
    // jsdom, beda dari TextDecoder yang tak selalu tersedia di lingkungan tes).
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Token dianggap kedaluwarsa bila cacat atau `exp`-nya sudah lewat. Token tanpa
 * `exp` dianggap TIDAK kedaluwarsa -- backend selalu mengisinya (session.ttlHours,
 * default 24 jam, lihat session.module.ts), jadi ketiadaan `exp` bukan alasan
 * memaksa pengguna keluar.
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

/**
 * SEBELUMNYA cuma memeriksa ADA-nya token, tanpa peduli masa berlakunya
 * (laporan user 2026-08-18: "baru akses localhost sudah terlihat login padahal
 * belum login"). Token sesi lama bertahan di localStorage/cookie selamanya --
 * menutup tab, mematikan dev server, atau rebuild tidak menghapusnya, karena
 * artefak itu milik browser pada origin-nya, bukan milik aplikasi. Akibatnya
 * navbar menampilkan avatar & menu akun seolah masih login, padahal setiap
 * panggilan API pasti 401.
 *
 * Klaim JWT dibaca di SISI KLIEN saja. proxy.js sengaja tetap TIDAK mendekode
 * token (keputusan lama: Edge Runtime tak bergantung pada isi klaim, itulah
 * sebabnya cookie `role` disimpan terpisah) -- karena itu sesi basi dibersihkan
 * di sini, termasuk cookie-nya, agar keputusan proxy ikut menyusul.
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    if (isTokenExpired(token)) {
      // Wajib clearSession(), bukan sekadar `return false`: kalau cookie `token`
      // & `role` dibiarkan, proxy.js masih menganggap sesi hidup sehingga halaman
      // /admin-* tetap terbuka walau seluruh API-nya 401 -- keadaan setengah
      // login yang justru lebih membingungkan.
      clearSession();
      return false;
    }
    return true;
  }

  // Jalur SSO (2026-08-27): tak ada token yang bisa dibaca -- ia HttpOnly di
  // cookie `session`. Yang dipakai adalah waktu kedaluwarsa yang dititipkan
  // backend saat callback. Pemeriksaannya sengaja sama ketat: sesi yang sudah
  // lewat waktunya ikut dibersihkan, bukan cuma dilaporkan `false`.
  const expiresAt = Number(localStorage.getItem(SSO_EXPIRES_KEY));
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;
  if (expiresAt * 1000 <= Date.now()) {
    clearSession();
    return false;
  }
  return true;
}

/** Role tersimpan lokal (untuk keputusan tampilan client, mis. menu aktif). */
export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}
