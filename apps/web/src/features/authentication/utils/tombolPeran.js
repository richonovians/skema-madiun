/**
 * Pemetaan TOMBOL pemilih peran -> peran-yang-dipakai (`act`).
 *
 * TIGA TOMBOL, BUKAN EMPAT (permintaan pengguna 8 September 2026): "role
 * superuser masuk melewati tombol admin kabupaten bukan tombol superuser tetapi
 * hak aksesnya tetap berbeda dengan admin kabupaten (bisa manajemen user dan
 * audit log)."
 *
 * Dipisah dari komponennya dengan sengaja. Yang ditentukan di sini bukan label,
 * melainkan klaim `act` yang dikirim ke `POST /auth/acting-role` — dan klaim
 * itulah yang menentukan hak akses sesungguhnya di backend (acting-role.util.ts:
 * hak = `act` ∩ `roles`). Salah memetakan berarti salah memberi hak, jadi ia
 * pantas diuji tanpa perlu merender satu pun tombol.
 *
 * Perlu dinyatakan terus terang: ini bukan penjaga keamanan. Backend tetap
 * menolak `act` yang tak dimiliki akun (403), jadi memalsukan permintaan di sini
 * hanya menghasilkan penolakan — bukan kenaikan hak.
 */

/** Kunci tombol. Sejak peleburan 15 September 2026 seluruhnya senama dengan role. */
export const KUNCI_TOMBOL = {
  KABUPATEN: 'kabupaten',
  OPD: 'opd',
  WARGA: 'responden',
};

/** Role backend yang membuat sebuah tombol layak ditampilkan. */
const ROLE_PEMBUKA = {
  [KUNCI_TOMBOL.KABUPATEN]: ['kabupaten'],
  [KUNCI_TOMBOL.OPD]: ['opd'],
  [KUNCI_TOMBOL.WARGA]: ['responden'],
};

/** Urutan tampil, tetap — tidak mengikuti urutan `roles` kiriman server. */
const URUTAN = [KUNCI_TOMBOL.KABUPATEN, KUNCI_TOMBOL.OPD, KUNCI_TOMBOL.WARGA];

/**
 * Tombol yang ditampilkan untuk sebuah akun.
 * @param {string[]} roles role backend yang DIMILIKI akun
 * @returns {string[]} kunci tombol, tanpa duplikat, dalam urutan tetap
 */
export function tombolUntukRoles(roles = []) {
  return URUTAN.filter((kunci) => ROLE_PEMBUKA[kunci].some((role) => roles.includes(role)));
}

/**
 * Peran-yang-dipakai untuk sebuah tombol.
 *
 * Sejak `superuser` dilebur ke `kabupaten` (15 September 2026) tak ada lagi
 * percabangan: setiap tombol memetakan ke peran senama. Yang SENGAJA tidak
 * dilakukan tetap sama -- tak ada "ambil role tertinggi yang dimiliki": seorang
 * Admin Kabupaten yang menekan "Masyarakat" harus benar-benar menjadi warga,
 * termasuk terkena gerbang persetujuan UU PDP.
 *
 * @param {string} kunciTombol salah satu KUNCI_TOMBOL
 * @param {string[]} roles role backend yang DIMILIKI akun
 * @returns {string} peran yang dikirim sebagai `act`
 */
export function peranUntukTombol(kunciTombol) {
  return kunciTombol;
}
