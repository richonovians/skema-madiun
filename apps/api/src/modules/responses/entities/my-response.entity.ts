import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Satu baris riwayat "survei yang SAYA isi" — untuk dashboard warga
 * (2026-08-24, permintaan user: riwayat aktivitas juga mencatat pengisian survei).
 *
 * TIDAK melanggar keanoniman SKM. Yang dijaga `ResponseEntity` adalah admin OPD/
 * Kabupaten tak boleh tahu SIAPA yang mengisi sebuah respons; di sini pemilik
 * respons melihat catatannya SENDIRI, disaring `userId = pengguna yang login`.
 * Karena itu entity ini pun tak memuat `userId`: tak ada gunanya mengembalikan id
 * yang sudah pasti milik si pemanggil.
 *
 * Jawaban (`answers`) sengaja TIDAK disertakan: riwayat hanya perlu tahu survei apa
 * dan kapan diisi, sedangkan isi jawaban tak pernah ditampilkan ke warga di mana
 * pun — memuatnya hanya memperbesar payload tanpa pemakai.
 */
export class MyResponseEntity extends BaseEntity<MyResponseEntity> {
  id: number;
  surveyId: number;
  /** Judul survei, agar klien tak perlu memanggil `GET /surveys/:id` per baris. */
  surveyJudul: string;
  periode: string;
  /** Nama OPD penyelenggara; null bila relasi OPD-nya sudah hilang. */
  opdNama: string | null;
  submittedAt: Date;
}
