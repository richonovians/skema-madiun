// Penyimpanan token sesi. Disimpan di DUA tempat dengan alasan berbeda:
// - localStorage: dibaca interceptor axios (api.js) untuk header Authorization di client.
// - cookie: dibaca proxy.js (jalan di server/edge, tak bisa akses localStorage) untuk proteksi route.
//
// SATU-SATUNYA impor berkas ini, dan sengaja ke modul yang tak mengimpor apa pun
// (8 September 2026). `api.js` mengimpor `clearSession` dari sini, jadi
// mengimpor `api.js` balik akan berputar.
import { API_BASE_URL } from '@/services/apiBase';

const TOKEN_KEY = 'token';
// `role` (2026-08-05): SEBELUMNYA hanya token yang disimpan -- proxy.js tak
// bisa membedakan peran sama sekali, sehingga Responden bisa membuka
// /admin-kab & /admin-opd (halaman terbuka, walau API-nya tetap 403 di
// backend). Disimpan cookie TERPISAH dari token, bukan didekode dari JWT,
// karena proxy.js Edge Runtime tak boleh bergantung pada isi klaim token.
const ROLE_KEY = 'role';
// Peran yang SEDANG DIPAKAI pada sesi ini (5 September 2026):
// 'kabupaten' | 'opd' | 'responden' | 'superuser'. MENGGANTIKAN cookie `area`
// milik superuser beserta cookie `opd` -- mekanismenya kini berlaku bagi siapa
// pun ber-role banyak, bukan kekhususan satu peran.
//
// Disimpan sebagai cookie terpisah (bukan didekode dari token) karena yang
// membacanya proxy.js di edge/server, dan Edge Runtime sengaja tak bergantung
// pada isi klaim token.
//
// JUJUR soal sifatnya, sama seperti sebelumnya: ini PEMBATAS NAVIGASI. Bedanya
// sekarang menyuntingnya di peramban tak lagi cukup untuk memperoleh hak peran
// lain -- hak ditentukan klaim `act` DI DALAM token, yang tak dapat dipalsukan
// tanpa kunci tanda tangan. Cookie yang disunting hanya menghasilkan halaman
// yang seluruh API-nya menolak: membingungkan, bukan celah.
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
 * UMUR COOKIE NAVIGASI -- SENGAJA DITULIS EKSPLISIT (2 September 2026).
 *
 * Laporan pengguna: "baru pertama kali mengakses skema.local sudah terlihat
 * login tetapi tombol tidak bisa digunakan, dan anehnya data OPD muncul semua
 * pada dropdown". Ketiga gejala itu satu sebab.
 *
 * Artefak sesi disimpan di DUA tempat dengan MASA HIDUP BERBEDA:
 *   - localStorage : abadi sampai dihapus tangan;
 *   - cookie       : dulu ditulis TANPA `Max-Age` sama sekali, sehingga ia
 *     COOKIE SESI -- peramban membuangnya begitu jendela ditutup seluruhnya.
 *
 * Akibatnya, sesudah peramban ditutup lalu dibuka lagi:
 *   - UI bilang "sudah masuk" (isAuthenticated membaca localStorage) dan avatar
 *     berinisial pengguna muncul di navbar;
 *   - setiap panggilan API tetap 200 karena header Authorization diambil dari
 *     localStorage, BUKAN dari cookie -- itulah sebab daftar OPD tetap terisi
 *     penuh di dropdown "Pilih Instansi";
 *   - tapi proxy.js membaca COOKIE, dan cookienya sudah tidak ada. Jadi setiap
 *     halaman terlindung dipantulkan ke '/'. Karena pengguna memang sudah
 *     berada di '/', menekan "Layanan Pengaduan" atau "Survei Kepuasan"
 *     tampak seperti tombol yang mati -- terukur: '/' -> '/', tak bergerak.
 *
 * Yang diperbaiki adalah cookienya, bukan sebaliknya, supaya jalur dev-login
 * SAMA dengan jalur SSO: cookie `session` milik backend sudah memikul `Max-Age`
 * sesuai masa berlaku tokennya (lihat catatan di clearSession), jadi jalur
 * dev-login-lah yang menyimpang.
 *
 * Tak ada hak baru yang diberikan: tokennya sendiri sudah bertahan 24 jam di
 * localStorage: cookie ini cuma salinan penanda supaya proxy sepakat dengan UI.
 */
const UMUR_CADANGAN_DETIK = 24 * 60 * 60;

/** Sisa detik menuju `epochDetik`; jatuh ke cadangan bila nilainya tak masuk akal. */
function umurDariEpoch(epochDetik) {
  if (!Number.isFinite(epochDetik) || epochDetik <= 0) return UMUR_CADANGAN_DETIK;
  const sisa = Math.floor(epochDetik - Date.now() / 1000);
  return sisa > 0 ? sisa : 0;
}

function tulisCookieSesi(nama, nilai, umurDetik) {
  document.cookie = `${nama}=${nilai}; path=/; SameSite=Lax; max-age=${umurDetik}`;
}

function adaCookie(nama) {
  return document.cookie.split('; ').some((bagian) => bagian.startsWith(`${nama}=`));
}

/**
 * Sisa umur sesi yang sedang berjalan, dibaca dari localStorage. Dipakai cookie
 * yang ditulis SESUDAH login (area kerja, OPD yang diperankan, persetujuan)
 * supaya semuanya kedaluwarsa bersamaan dengan tokennya -- kalau umurnya
 * berbeda-beda, kita hanya menukar satu keadaan setengah login dengan yang lain
 * (mis. cookie token hidup tapi cookie `role` mati: proxy melihat sesi tanpa
 * peran, lalu memantulkan admin dari areanya sendiri).
 */
function sisaUmurSesi() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return umurDariEpoch(decodeJwtPayload(token)?.exp);
  return umurDariEpoch(Number(localStorage.getItem(SSO_EXPIRES_KEY)));
}

/**
 * Tulis ulang SELURUH cookie navigasi dari localStorage.
 *
 * Perlu ada supaya peramban yang SUDAH terjebak keadaan setengah login sembuh
 * sendiri begitu halaman dibuka -- tanpa ini pengguna harus menghapus data
 * situs atau logout-login manual, padahal tak ada tanda apa pun yang
 * memberitahunya. Tidak menaikkan hak siapa pun: sumbernya localStorage milik
 * origin ini, dan tokennya memang sudah dipakai untuk setiap panggilan API.
 *
 * Cookie `session` (jalur SSO) TIDAK bisa ditulis dari sini -- ia HttpOnly milik
 * backend. Itu memang tak perlu: cookie itu sudah memikul Max-Age sendiri.
 */
export function selaraskanCookieSesi() {
  if (typeof window === 'undefined') return;
  const umur = sisaUmurSesi();
  if (umur <= 0) return;

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) tulisCookieSesi(TOKEN_KEY, token, umur);

  const role = localStorage.getItem(ROLE_KEY);
  if (role) tulisCookieSesi(ROLE_KEY, role, umur);

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent) tulisCookieSesi(CONSENT_KEY, consent, umur);
}

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
  // Umur cookie diambil dari `exp` token itu sendiri, bukan angka tetap: kalau
  // cookienya hidup lebih lama daripada tokennya, proxy membukakan halaman yang
  // seluruh API-nya sudah pasti 401.
  const umur = umurDariEpoch(decodeJwtPayload(token)?.exp);
  tulisCookieSesi(TOKEN_KEY, token, umur);
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    tulisCookieSesi(ROLE_KEY, role, umur);
  }
  simpanPenandaPersetujuan(role, consentRequired);
}

/**
 * Tulis penanda persetujuan yang dibaca proxy.js.
 *
 * Ikut disimpan di localStorage (2 September 2026) supaya `selaraskanCookieSesi`
 * bisa memulihkannya. Tanpa cerminan itu, peramban yang cookie-nya sudah hilang
 * akan memantulkan warga ke /persetujuan meski ia sudah menyetujui -- halaman
 * itu memang memeriksa ulang lewat GET /auth/me dan memantulkannya kembali,
 * tapi berarti satu putaran alihan yang tak perlu.
 */
/**
 * Tulis penanda persetujuan dari jawaban login, dengan satu syarat penting.
 *
 * `consentRequired: false` dari backend hanya BERARTI "sudah menyetujui" bila
 * perannya memang sudah ditentukan. Selama belum -- akun ber-peran banyak yang
 * belum memilih -- `AuthService.getRoles` & `getMe` sama-sama memakai
 * `actingRole ? isRequired(...) : false`, sehingga `false` di sana berarti
 * "belum dapat ditentukan".
 *
 * Menulisnya sebagai "sudah setuju" membukakan seluruh area warga bagi orang
 * yang belum pernah melihat gerbangnya, DAN memantulkannya dari /persetujuan --
 * satu-satunya halaman yang dapat memperbaiki keadaan itu (laporan pengguna
 * 14 September 2026).
 *
 * Lapis pertamanya ada di `setActingRole`, yang mengoreksi penanda ini begitu
 * perannya dipilih. Yang di sini menjaga jendela sebelum pilihan itu.
 */
function simpanPenandaPersetujuan(role, consentRequired) {
  saveConsentFlag(role ? !consentRequired : false);
}

export function saveConsentFlag(sudahMenyetujui) {
  if (typeof window === 'undefined') return;
  const nilai = sudahMenyetujui ? '1' : '0';
  localStorage.setItem(CONSENT_KEY, nilai);
  tulisCookieSesi(CONSENT_KEY, nilai, sisaUmurSesi());
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
  // Ditulis PALING AWAL karena `sisaUmurSesi()` di bawah membacanya -- pada
  // jalur SSO tak ada token yang bisa didekode, jadi ini satu-satunya sumber
  // masa berlaku yang dimiliki sisi klien.
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    localStorage.setItem(SSO_EXPIRES_KEY, String(expiresAt));
  }
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    // Jalur SSO pun kena masalah yang sama, dan di sini akibatnya justru lebih
    // membingungkan: cookie `session` milik backend BERTAHAN (ia punya Max-Age),
    // sementara cookie `role` yang ditulis di sini dulu mati saat peramban
    // ditutup. Proxy lalu melihat sesi hidup TANPA peran, sehingga
    // `hasFullAccess` false dan admin dipantulkan dari areanya sendiri ke '/'.
    tulisCookieSesi(ROLE_KEY, role, umurDariEpoch(expiresAt));
  }
  simpanPenandaPersetujuan(role, consentRequired);
}

/**
 * Minta SERVER mematikan sesinya. Tembak-dan-lupakan.
 *
 * Cookie `session` HttpOnly hanya dapat dihapus oleh yang menyetelnya, jadi ini
 * satu-satunya cara `clearSession()` benar-benar mengakhiri sesi alih-alih
 * sekadar melupakannya (perbaikan sesi hantu, 8 September 2026).
 *
 * `fetch` mentah, BUKAN instance axios: `api.js` mengimpor berkas ini, jadi
 * mengimpornya balik akan berputar -- dan yang lebih penting, permintaan ini
 * tak boleh melewati interceptor 401 milik axios, yang justru memanggil
 * `clearSession()` lagi.
 *
 * `keepalive` supaya tetap terkirim ketika pemanggilnya langsung menavigasi.
 * Galat DITELAN dengan sengaja: membersihkan sesi lokal tak boleh gagal gara-gara
 * jaringan, karena kegagalannya meninggalkan pengguna "setengah login" -- lebih
 * buruk daripada keadaan yang sedang diperbaiki.
 */
function matikanSesiDiServer() {
  try {
    void fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    }).catch(() => {});
  } catch {
    // `fetch` tak tersedia (mis. lingkungan uji tanpa polyfill) -- pembersihan
    // lokal di bawah tetap harus jalan.
  }
}

/**
 * Buang seluruh artefak sesi, DI KLIEN MAUPUN DI SERVER.
 *
 * Sampai 8 September 2026 fungsi ini hanya membersihkan sisi klien, dan
 * batasannya dinyatakan terus terang: cookie `session` HttpOnly tak dapat
 * dihapus dari JavaScript, jadi ketiga pemanggil logout (useLogout,
 * ProfileActions, ProfileAvatarDropdown) memanggil `POST /auth/logout` lebih
 * dulu. Yang terlewat: pemanggil LAIN tidak.
 *
 * `isAuthenticated()` memanggilnya begitu `sso_expires_at` hilang atau lewat,
 * dan interceptor 401 di `api.js` juga. Pada jalur-jalur itu sesi server tetap
 * hidup sementara antarmuka menyatakan logout -- dan setiap panggilan API masih
 * dijawab 200. Itulah "sesi hantu" yang dilaporkan pengguna: daftar OPD tetap
 * terisi di beranda padahal navbar menampilkan tombol masuk.
 *
 * Karena itu permintaan logout dipindah KE SINI, ke satu-satunya tempat yang
 * pasti dilewati semua jalur. Pemanggil yang sudah memanggil endpointnya sendiri
 * jadi mengirim dua kali; itu tak berakibat apa pun -- yang kedua tiba tanpa
 * cookie, dijawab 401, dan tak menghasilkan baris audit kedua.
 */
export function clearSession() {
  if (typeof window === 'undefined') return;
  // Yang dimatikannya jalur SSO saja, dan itu memang lingkupnya: backend
  // menerima `Authorization: Bearer` (dev-login) ATAU cookie `session` (SSO),
  // dan permintaan ini tak membawa header Bearer. Pada jalur dev-login tokennya
  // dipegang klien dan tak ada apa pun di server yang perlu dicabut, jadi 401
  // yang ditelan di sana bukan kegagalan -- sesi hantunya khas SSO, karena hanya
  // di sanalah ada cookie yang JavaScript tak dapat hapus.
  matikanSesiDiServer();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(SSO_EXPIRES_KEY);
  // Cerminan penanda persetujuan ikut dibuang -- alasannya sama dengan
  // cookienya di bawah: membiarkannya berarti warga BERIKUTNYA di peramban ini
  // memulihkan persetujuan orang lain lewat selaraskanCookieSesi().
  localStorage.removeItem(CONSENT_KEY);
  localStorage.setItem('sso_logged_in', 'false');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
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

/**
 * Simpan peran yang sedang dipakai. MENGGANTIKAN `saveSuperuserArea` +
 * `saveActingOpd` (5 September 2026).
 *
 * OPD tidak lagi disimpan di sisi klien sama sekali: seseorang yang bertindak
 * sebagai Admin OPD memakai instansi yang tercantum di AKUNNYA, dan backend
 * menurunkannya sendiri dari `users.opd_id` (opd-scope.util.ts). Menyimpan
 * salinannya di peramban hanya menciptakan sumber kedua yang bisa basi.
 */
export function saveActingRoleCookie(role) {
  if (typeof window === 'undefined' || !role) return;
  localStorage.setItem(ROLE_KEY, role);
  tulisCookieSesi(ROLE_KEY, role, sisaUmurSesi());
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
    // KEADAAN SETENGAH LOGIN YANG BERLAWANAN ARAH (2 September 2026): token di
    // localStorage masih sah, tapi cookienya sudah tidak ada. Dulu tak mungkin
    // dihindari -- cookienya cookie sesi, jadi tiap kali peramban ditutup
    // keadaan ini pasti terjadi. Sekarang cookienya bermasa hidup, tapi
    // peramban yang SUDAH terjebak (termasuk yang cookienya dihapus tangan)
    // tetap perlu jalan sembuh: tanpa ini, UI bilang sudah masuk sementara
    // proxy memantulkan setiap halaman terlindung ke '/'.
    if (!adaCookie(TOKEN_KEY)) selaraskanCookieSesi();
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
  // Sama seperti jalur dev-login di atas, tapi yang diperiksa cookie `role`:
  // di jalur SSO cookie tokennya (`session`) HttpOnly milik backend dan sudah
  // bermasa hidup sendiri, sedangkan `role`/`area`/`consent` ditulis dari sini.
  // Kalau `role` hilang, proxy melihat sesi hidup tanpa peran dan memantulkan
  // admin dari areanya sendiri.
  if (!adaCookie(ROLE_KEY)) selaraskanCookieSesi();
  return true;
}

/** Role tersimpan lokal (untuk keputusan tampilan client, mis. menu aktif). */
export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}
