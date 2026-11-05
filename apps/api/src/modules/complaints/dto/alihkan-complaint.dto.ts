import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { COMPLAINT_CATEGORIES } from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);

/**
 * Body `PATCH /complaints/:id/alihkan` — memindahkan pengaduan yang SUDAH
 * bertujuan ke instansi lain yang lebih berwenang (5 November 2026).
 *
 * BEDANYA DARI `ForwardComplaintDto`. Yang itu mengisi tujuan yang masih
 * kosong (triase, Admin Kabupaten saja) dan tak menggeser status. Yang ini
 * memindahkan tujuan yang sudah ada, boleh dilakukan Admin OPD pemiliknya
 * sendiri, dan menggeser status ke `dialihkan`.
 *
 * TAK ADA MEDAN `tingkat`. Ia diturunkan dari nama OPD tujuan lewat
 * `tingkatOpd()` di service; membiarkan pemanggil mengirimkannya hanya membuka
 * cara menyimpan tingkat yang bertentangan dengan OPD-nya sendiri.
 */
export class AlihkanComplaintDto {
  @ApiProperty({ description: 'Id OPD yang akan menerima pengaduan ini' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId: number;

  /**
   * Kategori baru, WAJIB — alasan fitur ini ada memang kategori yang tak
   * sesuai dengan instansi tujuannya.
   *
   * Daftarnya memuat KEDUA tingkat, sebab DTO belum tahu tingkat tujuannya.
   * Kesepadanan kategori dengan tingkat OPD tujuan ditegakkan
   * `assertKategoriSesuaiTingkat` di service: ia membandingkan dua medan, dan
   * tak ada dekorator class-validator yang dapat menyatakannya.
   */
  @ApiProperty({ description: 'Kode kategori baru, harus milik tingkat OPD tujuan' })
  @IsIn(KATEGORI_KODE)
  kategori: string;

  /**
   * Alasan pengalihan, WAJIB. Ditampilkan kepada pelapor pada linimasa.
   *
   * DIPANGKAS LEBIH DAHULU, dan itu bukan kerapian: `@IsNotEmpty()` sendirian
   * meloloskan `'   '`, dan baris riwayat yang lahir darinya tak menjelaskan
   * apa pun — padahal itulah satu-satunya alasan catatan diwajibkan di sini.
   */
  @ApiProperty({ description: 'Alasan pengalihan, ditampilkan kepada pelapor' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  // Batas yang SAMA dengan `UpdateComplaintStatusDto.catatan`: keduanya
  // menulis ke kolom `complaint_status_history.catatan` yang sama, dan dua
  // batas berbeda atas satu kolom berarti salah satunya tak berlaku.
  @MaxLength(1000)
  catatan: string;
}
