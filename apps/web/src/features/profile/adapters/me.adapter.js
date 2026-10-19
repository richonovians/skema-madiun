import { formatDateId, getInitials } from '@/utils/format';
import { ROLE_LABEL } from '@/utils/enumLabels';

// `superuser` dipisah kembali dari `kabupaten` (2026-08-20) -- lihat userConstants.js.
// Peran INILAH yang menentukan tampil-tidaknya log aktivitas, karena datangnya
// dari backend (GET /auth/me), bukan dari cookie yang bisa disunting di browser.
const ROLE_TO_FRONTEND = {
  opd: 'ADMIN_OPD',
  kabupaten: 'ADMIN_KABUPATEN',
  responden: 'RESPONDENT',
};

/**
 * NIK tersamar untuk halaman profil sendiri (1 Oktober 2026).
 *
 * PENYAMARAN, BUKAN PEMOTONGAN. Empat digit pertama dan empat terakhir cukup
 * bagi pemiliknya untuk mengenali nomornya sendiri, sementara dua belas digit
 * di tengah -- yang memuat tanggal lahir dan nomor urut -- tidak ikut terbaca
 * orang yang kebetulan melihat layarnya.
 *
 * DI SINI, BUKAN DI BACKEND, dan itu disengaja. Yang dilindungi penyamaran ini
 * adalah tatapan sekilas ke arah layar, bukan jaringan: nomornya milik
 * pemilik sesi itu sendiri, sehingga mengirimkannya bukan kebocoran. Menaruh
 * penyamaran di tampilan juga menyisakan ruang bagi tombol "tampilkan nomor
 * lengkap" tanpa perlu menyentuh backend.
 *
 * BERBEDA DARI JALUR PENGADUAN, yang menyamarkan di BACKEND
 * (`apps/api` common/identitas/nik.ts) justru karena NIK di sana milik ORANG
 * LAIN -- nomor penuhnya tak punya alasan sampai ke peramban petugas. Dua
 * tempat, dua alasan, keputusan tersurat pengguna 1 Oktober 2026.
 *
 * RISIKONYA DISEBUT: aturan yang sama hidup di dua runtime dan dapat
 * menyimpang diam-diam. Keduanya WAJIB menghasilkan bentuk yang sama, dan
 * masing-masing punya ujinya sendiri yang menuliskan bentuk itu tersurat.
 *
 * PANJANG YANG TAK DIKENALI DITUTUP SELURUHNYA. Helpdesk tak menjamin 16
 * digit, dan menyamarkan berdasarkan posisi pada nilai yang panjangnya tak
 * dikenal dapat membuka justru bagian yang ingin ditutup.
 */
export function samarkanNik(nik) {
  if (!nik) return null;
  const bersih = String(nik).trim();
  if (bersih === '') return null;
  if (!/^\d{16}$/.test(bersih)) return '•'.repeat(bersih.length);
  return `${bersih.slice(0, 4)} ${bersih.slice(4, 6)}•• •••• ${bersih.slice(12)}`;
}

/**
 * Terjemahkan MeEntity backend (GET /auth/me) ke bentuk yang dipakai komponen
 * profil. Satu tempat
 * -- perubahan kontrak backend cukup diubah di sini (INT-16).
 *
 * CATATAN GAP, DIPERBARUI 1 Oktober 2026. Berkas ini sempat menyatakan bahwa
 * `nik`, `phone`, dan `address` "TIDAK ADA di skema manapun", dan ketiganya
 * dipaku null di bawah. Itu benar ketika ditulis: RespondentProfile memang cuma
 * menyimpan demografis untuk keperluan IKM, bukan identitas pribadi.
 *
 * GAP ITU SUDAH TERTUTUP. `users.nik`, `users.nomor_hp`, dan `users.alamat`
 * lahir hari ini bersama penyalinan identitas dari akun Helpdesk saat login,
 * dan `GET /auth/me` mengirimkan ketiganya dalam keadaan TERDEKRIPSI. Catatan
 * lamanya tidak dihapus melainkan ditulis ulang di sini, sebab akibatnya bukan
 * sekadar komentar yang keliru: selama ia berlaku, halaman profil menggambar
 * tiga tanda hubung dan menjelaskannya dengan kalimat "belum tersedia karena
 * tidak disimpan sistem" -- menyalahkan sistem atas data yang sudah ada.
 *
 * YANG MASIH GAP:
 *   - avatarUrl -- tak ada konsep foto profil di backend. Helpdesk mengirim
 *     `profile_picture`, tetapi memakainya menyeret unduhan berkas dari pihak
 *     luar beserta urusan penyimpanan & masa simpannya: pekerjaan tersendiri.
 * Field ini SENGAJA null di sini, bukan dikarang.
 *
 * SSO (diperbarui 2026-08-27, celah 5): modul SSO Helpdesk SUDAH dibangun, jadi
 * `providerName` tak lagi selalu null. Yang menentukan bukan tebakan pola string
 * di sini melainkan `me.ssoLinked` dari BACKEND -- ia tahu mana `ssoSubject` yang
 * sub asli Helpdesk dan mana yang masih penampung (`seed-*`, `pending:...`).
 * Menyalin aturan itu ke sini berarti dua tempat harus mengingat hal yang sama.
 */
export function adaptMe(me) {
  // `role` tunggal DIGANTI dua nilai (5 September 2026):
  // - `roles`      : KEPEMILIKAN, dipakai menyusun pemilih peran.
  // - `actingRole` : peran yang SEDANG DIPAKAI, dan inilah yang mencerminkan
  //                  hak akses -- setiap keputusan tampilan yang meniru
  //                  penjagaan backend harus memakai nilai ini.
  //
  // Kunci `role` SENGAJA tidak dipertahankan sebagai alias: membiarkannya
  // berarti tempat-tempat yang seharusnya berpindah ke `actingRole` tetap
  // bekerja "seperti biasa" dan salahnya tak terlihat.
  const frontendRoles = (me.roles ?? []).map((r) => ROLE_TO_FRONTEND[r] ?? r);
  const frontendRole = me.actingRole
    ? (ROLE_TO_FRONTEND[me.actingRole] ?? me.actingRole)
    : null;
  return {
    id: me.id,
    name: me.nama,
    initials: getInitials(me.nama),
    email: me.email,
    phone: me.nomorHp ?? null,
    // Nilai PENUH tetap dibawa walau kartunya menggambar yang tersamar: ia
    // milik orang yang sedang melihatnya sendiri, dan menyediakannya di sini
    // membuat "tampilkan nomor lengkap" kelak cukup perubahan tampilan.
    nik: me.nik ?? null,
    nikMasked: samarkanNik(me.nik),
    address: me.alamat ?? null,
    occupation: me.respondentProfile?.pekerjaan ?? null,
    roles: frontendRoles,
    actingRole: frontendRole,
    roleLabel: frontendRole ? (ROLE_LABEL[frontendRole] ?? frontendRole) : null,
    // OPD tempat akun ini bertugas. Backend cuma mengirim ID-nya (MeEntity tak
    // memuat nama OPD), jadi pemanggil yang butuh namanya menyandingkan sendiri
    // lewat GET /opd/:id -- lihat AdminNavbar.jsx. `null` untuk kabupaten &
    // responden yang memang tak tertaut OPD.
    opdId: me.opdId ?? null,
    avatarUrl: null, // gap
    status: me.isActive ? 'ACTIVE' : 'INACTIVE',
    joinedAt: formatDateId(me.createdAt),
    lastLogin: me.lastLoginAt ? formatDateId(me.lastLoginAt) : null,
    sso: {
      isConnected: true, // bisa lihat halaman ini berarti sesi sudah aktif
      // Terisi HANYA bila akun benar-benar tertaut SSO. Selama masih memakai
      // dev-login, `ssoLinked` false dan kartunya jujur berbunyi "belum
      // tersambung" -- bukan mengarang nama penyedia yang tak pernah dipakai.
      providerName: me.ssoLinked ? 'SSO Helpdesk Kabupaten Madiun' : null,
      accountId: me.ssoSubject,
      // `lastLoginAt`, bukan waktu sinkronisasi tersendiri: itulah saat terakhir
      // profil ini benar-benar diperbarui dari Helpdesk (SsoService.acceptLogin
      // menyegarkan nama & waktu login pada setiap login SSO). Null bila belum
      // pernah tertaut, supaya tak terbaca sebagai sinkronisasi yang tak terjadi.
      lastSynced: me.ssoLinked && me.lastLoginAt ? formatDateId(me.lastLoginAt) : null,
      portalUrl: me.ssoLinked ? 'https://helpdesk.madiunkab.go.id' : null,
    },
  };
}
