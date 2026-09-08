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

/** Kunci tombol. BUKAN nama role: "kabupaten" dapat berarti `act=superuser`. */
export const KUNCI_TOMBOL = {
  KABUPATEN: 'kabupaten',
  OPD: 'opd',
  WARGA: 'responden',
};

/**
 * Role backend yang membuat sebuah tombol layak ditampilkan.
 *
 * Tombol Admin Kabupaten muncul untuk DUA role, dan itu bagian paling mudah
 * terlewat dari perubahan ini: penyaring lama (`roles.includes(kunciTombol)`)
 * akan memberi akun ber-role `[superuser]` NOL tombol — terkunci di luar
 * aplikasinya sendiri, tanpa satu pun pesan galat.
 */
const ROLE_PEMBUKA = {
  [KUNCI_TOMBOL.KABUPATEN]: ['kabupaten', 'superuser'],
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
 * Hanya tombol Admin Kabupaten yang bercabang; sisanya memetakan ke peran
 * senama. Percabangan itu SENGAJA tidak digeneralisasi menjadi "ambil role
 * tertinggi yang dimiliki": seorang superuser yang menekan "Warga" harus
 * benar-benar menjadi warga, termasuk terkena gerbang persetujuan UU PDP.
 * Menaikkan haknya di sana akan melewati gerbang itu.
 *
 * @param {string} kunciTombol salah satu KUNCI_TOMBOL
 * @param {string[]} roles role backend yang DIMILIKI akun
 * @returns {string} peran yang dikirim sebagai `act`
 */
export function peranUntukTombol(kunciTombol, roles = []) {
  if (kunciTombol === KUNCI_TOMBOL.KABUPATEN && roles.includes('superuser')) {
    // Akun yang memegang KEDUA role selalu masuk sebagai superuser. Akibatnya
    // ia kehilangan pilihan sengaja TURUN menjadi kabupaten biasa — disadari
    // dan disetujui pengguna 8 September 2026, karena tombolnya memang tinggal
    // satu.
    return 'superuser';
  }
  return kunciTombol;
}
