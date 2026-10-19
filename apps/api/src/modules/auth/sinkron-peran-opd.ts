import { JenisPengguna, Role } from '@prisma/client';

/**
 * Pencabutan peran `opd` saat login SSO (6 Oktober 2026).
 *
 * PERMINTAAN PENGGUNA: "jika opd id berganti maka yang semula menjadi admin opd
 * lama akan otomatis hangus dan berganti menjadi masyarakat biasa, sampai admin
 * kab mengatur menjadi admin opd lagi."
 *
 * APA YANG DIPERBAIKINYA. Sebelum berkas ini, `acceptLogin` menyegarkan
 * `opd_id` dari Helpdesk pada setiap login tetapi TIDAK PERNAH menyentuh
 * `roles`. Akibatnya terukur dari kodenya sendiri: seorang ASN yang berpindah
 * instansi tetap memegang peran Admin OPD, dan `opd_id` barunya membuat ia
 * otomatis mengelola instansi YANG BARU -- kenaikan hak yang tak pernah
 * diputuskan siapa pun dan tak terlihat di antarmuka mana pun.
 *
 * SATU-SATUNYA TEMPAT SSO BOLEH MENURUNKAN HAK, dan itu perlu dibaca bersama
 * keputusan 27 Agustus 2026 yang menolak sinkronisasi peran pada setiap login.
 * Alasan penolakan itu masih berlaku sepenuhnya: bila Helpdesk berhenti
 * mengirim klaim -- scope dicabut, bentuk payload bergeser, nama field salah
 * konfigurasi -- penyinkron yang naif akan melucuti setiap Admin OPD sekaligus,
 * dan kegagalan itu SENYAP.
 *
 * Keduanya hidup bersama lewat satu syarat keras: fungsi ini hanya bertindak
 * atas klaim yang HADIR DAN BERTENTANGAN dengan apa yang tersimpan. Klaim yang
 * tidak ada tidak pernah mencabut apa pun. Itu sebabnya `opdIdDariKlaim` dan
 * `jenisPenggunaDariKlaim` keduanya bertipe nullable, dan `null` di sini
 * berarti "tak diberitahu" -- bukan "tidak punya", dan bukan "bukan ASN".
 *
 * FUNGSI MURNI, tanpa Nest dan tanpa Prisma -- alasan yang sama seperti
 * `acting-role.util.ts` dan `sso-opd.mapper.ts`: ini titik tempat kesalahan
 * berakibat seseorang mengelola instansi yang bukan tempatnya, atau kehilangan
 * instansi yang memang tempatnya.
 */
export type AlasanCabut = 'opd-berganti' | 'bukan-asn';

export function peranSetelahSinkron(input: {
  roles: Role[];
  /** `opd_id` yang ADA DI BARIS sekarang, sebelum login ini menulis apa pun. */
  opdIdTersimpan: number | null;
  /** OPD dari klaim login ini. `null` = klaim tak ada, atau tak cocok ke OPD aktif mana pun. */
  opdIdDariKlaim: number | null;
  /** Jenis pengguna dari klaim login ini. `null` = klaim tak ada, atau nilainya tak dikenali. */
  jenisPenggunaDariKlaim: JenisPengguna | null;
}): { roles: Role[]; alasan: AlasanCabut | null } {
  const { roles, opdIdTersimpan, opdIdDariKlaim, jenisPenggunaDariKlaim } = input;

  if (!roles.includes(Role.opd)) {
    return { roles, alasan: null };
  }

  // Urutan ini disengaja. "Bukan ASN lagi" lebih mendasar daripada "pindah
  // instansi": orang yang bukan ASN tak punya instansi mana pun untuk dikelola,
  // jadi alasan itulah yang pantas masuk log audit ketika keduanya terjadi.
  const alasan: AlasanCabut | null =
    jenisPenggunaDariKlaim === JenisPengguna.masyarakat
      ? 'bukan-asn'
      : // `opdIdTersimpan === null` BUKAN perpindahan: tak ada instansi lama
        // yang ditinggalkan. Memperlakukannya sebagai perpindahan akan mencabut
        // peran seseorang pada login pertamanya, tepat ketika Admin Kabupaten
        // baru saja memberikannya.
        opdIdDariKlaim !== null && opdIdTersimpan !== null && opdIdDariKlaim !== opdIdTersimpan
        ? 'opd-berganti'
        : null;

  if (!alasan) {
    return { roles, alasan: null };
  }

  // Yang dibuang HANYA `opd`. Pemegang kabupaten+opd kehilangan satu peran,
  // bukan jatuh menjadi warga -- bentuk yang sama dengan resolveRolesAndOpd,
  // dan alasannya sama: kegagalan yang lebih besar daripada sebabnya bukan
  // perbaikan.
  const sisa = roles.filter((role) => role !== Role.opd);
  return {
    // Paket yang isinya hanya `opd` menjadi kosong di sini; `responden` adalah
    // jaring pengamannya, sebab akun tanpa satu pun peran tak dapat masuk ke
    // mana pun. Inilah "berganti menjadi masyarakat biasa" yang diminta.
    roles: sisa.length > 0 ? sisa : [Role.responden],
    alasan,
  };
}
