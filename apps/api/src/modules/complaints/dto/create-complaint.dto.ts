import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TingkatPengaduan } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { COMPLAINT_CATEGORIES } from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);

export class CreateComplaintDto {
  /**
   * OPSIONAL sejak 6 September 2026 (permintaan pengguna): pengirim yang tak
   * tahu pengaduannya harus ditujukan kepada siapa memilih "Lainnya (belum
   * tahu tujuannya)", lalu Admin Kabupaten meneruskannya lewat
   * `PATCH /complaints/:id/opd`.
   */
  @ApiPropertyOptional({
    description: 'Id OPD tujuan. Dikosongkan bila pengirim belum tahu tujuannya.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;

  /**
   * WAJIB sejak 4 November 2026 (permintaan pengguna). Menentukan daftar OPD
   * tujuan maupun daftar kategori yang sah, dan kesepadanan keduanya ditegakkan
   * `ComplaintsService.create` lewat `tingkat-pengaduan.util.ts` -- `@IsEnum`
   * di sini hanya menjamin nilainya salah satu dari dua.
   *
   * TANPA nilai baku. Kolomnya memang `@default(kabupaten)` di Prisma, tetapi
   * itu jaring pengaman bagi fixture yang menulis baris langsung; membiarkan
   * DTO ikut berbaku berarti pengirim yang lupa menyebut tingkat diam-diam
   * mendapat kabupaten, lalu ditolak di langkah berikutnya karena kategorinya
   * kategori kecamatan -- galat yang menunjuk medan yang salah.
   */
  @ApiProperty({
    enum: TingkatPengaduan,
    description: 'Cakupan pengaduan. Menentukan OPD tujuan & kategori yang sah.',
  })
  @IsEnum(TingkatPengaduan)
  tingkat: TingkatPengaduan;

  @ApiProperty({
    enum: KATEGORI_KODE,
    description:
      'Kode kategori (lihat GET /ref/complaint-categories). Harus milik `tingkat` di atas.',
  })
  @IsIn(KATEGORI_KODE)
  kategori: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  judul: string;

  @ApiProperty({ maxLength: 5000, description: 'Uraian pengaduan' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  uraian: string;

  /**
   * Tanggal kejadian, `YYYY-MM-DD` (4 November 2026, permintaan pengguna).
   *
   * WAJIB di sini meski kolomnya nullable di basis data: yang nullable hanyalah
   * 19 pengaduan yang dibuat sebelum medan ini lahir (lihat migrasi
   * `20261104090000_tingkat_pengaduan`). Setiap pengaduan BARU membawanya.
   *
   * Divalidasi dua lapis. `@Matches` di sini menolak bentuk yang salah;
   * `parseTanggalKejadian` di service menolak tanggal yang tak ada dalam
   * kalender (31 Februari) dan tanggal di masa depan -- keduanya tak dapat
   * dinyatakan sebagai regex, dan keduanya lolos `new Date()` tanpa keluhan.
   */
  @ApiProperty({ example: '2026-11-04', description: 'Tanggal kejadian (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'tanggalKejadian harus berformat YYYY-MM-DD' })
  tanggalKejadian: string;

  /**
   * Lokasi kejadian (4 November 2026, permintaan pengguna). WAJIB, dengan
   * alasan yang sama seperti `tanggalKejadian` di atas.
   *
   * 255 aksara, bukan 5000: ini alamat atau nama tempat, bukan kronologi --
   * itu tugas `uraian`. Batas yang longgar di sini hanya mengundang uraian
   * kedua yang tak akan terbaca di kolom tabel mana pun.
   *
   * DISIMPAN TERENKRIPSI oleh service (`enc:v1:`), satu perlakuan dengan
   * `uraian`: lokasi kejadian lazim menunjuk alamat rumah seseorang.
   */
  @ApiProperty({ maxLength: 255, example: 'Jl. Raya Dolopo No. 12, Desa Bangunsari' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lokasiKejadian: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Kirim tanpa menampilkan identitas pelapor kepada admin',
  })
  @IsOptional()
  // Nilai datang dari multipart (string), jadi konversinya EKSPLISIT -- pola
  // sama list-opd-query.dto.ts. `@Type(() => Boolean)` TIDAK dipakai karena
  // Boolean('false') === true, yang akan membuat setiap pengaduan biasa
  // terkirim sebagai anonim.
  /**
   * `@Type(() => String)` WAJIB di sini, dan bukan hiasan (15 Oktober 2026,
   * BUG-020).
   *
   * `app.setup.ts` menyalakan `transformOptions.enableImplicitConversion`, dan
   * class-transformer memakai tipe hasil refleksi SEBELUM memanggil
   * `@Transform` di bawah. Tipe refleksi medan ini `Boolean`, sehingga nilainya
   * melewati `Boolean('false')` -- yang bernilai `true` -- dan `@Transform` tak
   * pernah melihat string aslinya. Menyatakan `String` membuat konversi
   * implisit tak mengubah apa pun, lalu `@Transform` menerjemahkannya sendiri.
   */
  @Type(() => String)
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isAnonim?: boolean;
}
