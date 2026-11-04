import { BadRequestException } from '@nestjs/common';

/**
 * Terjemahkan `tanggalKejadian` (teks `YYYY-MM-DD` dari `<input type="date">`)
 * menjadi `Date` tengah malam UTC (4 November 2026).
 *
 * UTC, BUKAN WAKTU LOKAL SERVER. Kolomnya `DATE` -- ia tak menyimpan jam sama
 * sekali -- sedangkan `new Date('2026-11-04')` di Node sudah tengah malam UTC
 * sementara `new Date(2026, 10, 4)` tengah malam waktu server. Keduanya
 * menghasilkan tanggal yang sama HANYA bila servernya di UTC; di WIB (UTC+7)
 * bentuk kedua tersimpan sebagai 3 November. Tanggal kejadian yang mundur
 * sehari adalah cacat yang tak akan terlihat siapa pun di pengembangan, karena
 * ia hanya muncul lewat zona waktu.
 *
 * MENGAPA PARSING MANUAL, bukan `new Date(teks)` apa adanya. `Date` menerima
 * tanggal yang tak ada dengan menggulungnya diam-diam: '2026-02-31' menjadi
 * 3 Maret, dan '2026-13-01' justru `Invalid Date`. Dua perilaku berbeda untuk
 * dua kesalahan yang sama bentuknya, dan yang pertama menyimpan tanggal yang
 * tak pernah diketik pelapornya.
 */
const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTanggalKejadian(teks: string, sekarang: Date = new Date()): Date {
  const cocok = POLA_TANGGAL.exec(teks.trim());
  if (!cocok) {
    throw new BadRequestException('Tanggal kejadian harus berformat YYYY-MM-DD');
  }
  const [, thn, bln, tgl] = cocok;
  const tanggal = new Date(Date.UTC(Number(thn), Number(bln) - 1, Number(tgl)));

  // Pembandingan ulang inilah yang menangkap penggulungan diam-diam di atas:
  // 31 Februari masuk sebagai 3 Maret, dan bulan hasilnya tak lagi 02.
  if (
    tanggal.getUTCFullYear() !== Number(thn) ||
    tanggal.getUTCMonth() !== Number(bln) - 1 ||
    tanggal.getUTCDate() !== Number(tgl)
  ) {
    throw new BadRequestException(`Tanggal kejadian "${teks}" tidak ada dalam kalender`);
  }

  // "HARI INI" MENURUT WIB, bukan menurut jam server. Pelapornya di Kabupaten
  // Madiun (UTC+7) sementara servernya lazim berjalan di UTC, dan selama tujuh
  // jam setiap hari -- pukul 00.00 sampai 07.00 WIB -- keduanya berbeda
  // tanggal. Memakai tanggal UTC berarti warga yang melapor pagi-pagi ditolak
  // karena "tanggal kejadian melampaui hari ini", padahal yang ia pilih adalah
  // hari ini di tempatnya berdiri.
  //
  // Angkanya DIPAKU, bukan dibaca dari zona waktu proses: zona server bukan
  // keterangan tentang di mana warganya tinggal, dan satu `TZ` yang berubah di
  // produksi tak boleh menggeser batas validasi.
  const WIB_OFFSET_MENIT = 7 * 60;
  const wib = new Date(sekarang.getTime() + WIB_OFFSET_MENIT * 60_000);
  const hariIniWib = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  if (tanggal.getTime() > hariIniWib.getTime()) {
    throw new BadRequestException('Tanggal kejadian tidak boleh melampaui hari ini');
  }

  return tanggal;
}
