import { Role } from '@prisma/client';

/**
 * Kode galat yang dikenali frontend. Dikirim pada 401 saat sesi SAH tapi peran
 * yang ingin dipakai belum terpilih -- keadaan yang HARUS dibedakan dari "sesi
 * mati", karena penanganannya berlawanan: yang satu mengarahkan ke pemilih
 * peran, yang lain membuang sesi dan meminta login ulang.
 */
export const ROLE_SELECTION_REQUIRED = 'ROLE_SELECTION_REQUIRED';

export type ActingRoleResult =
  | { ok: true; actingRole: Role }
  | { ok: false; reason: 'SELECTION_REQUIRED' | 'OPD_WITHOUT_OPDID' };

/**
 * Tentukan peran yang SEDANG DIPAKAI dari klaim `act` di token dan himpunan
 * role yang benar-benar dimiliki akun menurut basis data.
 *
 * Fungsi MURNI, sengaja tanpa Nest dan tanpa Prisma. Ini inti keamanan seluruh
 * fitur multi-role; menaruhnya di dalam `SessionAuthProvider` berarti
 * mengujinya menuntut JWT + Prisma + request palsu, dan uji semahal itu
 * cenderung tak pernah ditulis lengkap.
 *
 * Hak akses = `act` ∩ `roles`. Token hanya menyatakan PILIHAN; basis data tetap
 * satu-satunya sumber KEPEMILIKAN. Karena itu mencabut role berlaku pada
 * permintaan BERIKUTNYA, tanpa menunggu token kedaluwarsa -- sifat yang sama
 * seperti sebelum fitur ini ada (lihat catatan payload minimal di
 * session.service.ts).
 */
export function resolveActingRole(input: {
  roles: Role[];
  act?: Role | null;
  opdId: number | null;
}): ActingRoleResult {
  const { roles, act, opdId } = input;

  // "act TIDAK ADA" dan "act ADA tapi tak dimiliki" DIBEDAKAN, dan bedanya
  // bukan kerapian:
  //
  // - Tak ada (login baru) + role tunggal  -> pakai role itu. Akun ber-role
  //   tunggal tak pernah perlu memilih apa pun.
  // - Ada tapi tak dimiliki (role baru dicabut) -> WAJIB memilih ulang, walau
  //   sisa rolenya cuma satu. Jatuh otomatis ke sisa itu bisa menjadi KENAIKAN
  //   hak: akun `[superuser]` yang tokennya menyebut `act=opd` akan diam-diam
  //   memperoleh log aktivitas sementara pemiliknya menyangka dirinya Admin OPD.
  const terpilih = act ? (roles.includes(act) ? act : null) : roles.length === 1 ? roles[0] : null;

  if (!terpilih) {
    // SENGAJA tidak jatuh ke "role tertinggi". Jatuh otomatis berarti hak
    // seseorang berubah tanpa ia memutuskan apa pun -- justru yang ingin
    // dihindari keputusan "hak ikut turun sesuai peran yang dipakai".
    return { ok: false, reason: 'SELECTION_REQUIRED' };
  }

  if (terpilih === Role.opd && opdId == null) {
    // Seharusnya mustahil: UsersService melarang memberi role `opd` tanpa
    // opdId. Tapi baris lama atau perubahan lewat SQL langsung bisa
    // menghasilkannya, dan jalur OPD tanpa opdId pasti gagal di
    // DashboardService.resolveDashboardOpdId -- lebih baik ditolak jujur di
    // gerbang daripada meledak di tengah halaman.
    return { ok: false, reason: 'OPD_WITHOUT_OPDID' };
  }

  return { ok: true, actingRole: terpilih };
}
