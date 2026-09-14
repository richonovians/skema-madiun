import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JenisKelamin } from '@prisma/client';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { KELOMPOK_UMUR, NOMOR_HP_REGEX } from '../responses.constants';
import { SubmitResponseDto } from './submit-response.dto';

/**
 * Payload pengisian survei TANPA sesi.
 *
 * DTO TERPISAH dari `SubmitResponseDto`, bukan medan opsional yang ditambahkan
 * ke sana: DTO itu juga dipakai jalur berpenjaga, dan menjadikan `setuju` medan
 * wajib di sana akan memaksa pengguna yang sudah login mengirim persetujuan
 * yang persetujuannya SUDAH tercatat di `users.consentAt`.
 *
 * `setuju` wajib bernilai true, dan inilah penegakan sesungguhnya. Gerbang di
 * frontend hanya pembatas navigasi yang dapat dilewati dengan satu permintaan
 * langsung; tanpa penjaga di sini, gerbang PDP-nya hanya hiasan. Alasan yang
 * sama sudah tertulis di ConsentGate.jsx bagi jalur yang berpenjaga.
 *
 * SELURUH data dirinya OPSIONAL di sini, karena pengisi boleh memilih "tanpa
 * data diri". Kewajibannya ditegakkan GerbangPengisianPublik di frontend, bukan
 * di sini, dan itu pilihan yang disadari: "wajib kecuali memilih anonim" adalah
 * aturan pasangan medan, dan menyatakannya lewat validator per-medan menuntut
 * validasi bersyarat yang membaca medan lain. Yang dijaga backend justru yang
 * tak boleh bergantung pada frontend, yaitu persetujuan PDP dan BENTUK setiap
 * nilai yang masuk. Pengisi yang melompati gerbang lewat permintaan langsung
 * paling jauh hanya menghasilkan respons tanpa data diri, dan respons seperti
 * itu memang sah.
 *
 * Persetujuan tetap WAJIB meski ia memilih tanpa data diri: yang diproses
 * adalah jawaban surveinya, dan itu tetap diproses apa pun pilihannya.
 *
 * NAMA & NOMOR HP ADA DI SINI sejak permintaan tersurat pengguna 8 September
 * 2026, yang membalik keputusan hari yang sama untuk membuang keduanya. Belum
 * ada satu pun layar yang membacanya (`ResponseEntity` cuma memuat id,
 * surveyId, submittedAt), jadi sampai ada laporan yang memakainya, keduanya
 * data pribadi yang tersimpan tanpa pembaca. Alasan penolakan yang dulu masih
 * berlaku sebagai catatan, bukan sebagai penghalang.
 */
export class SubmitPublicResponseDto extends SubmitResponseDto {
  @ApiPropertyOptional({
    description:
      'Token Cloudflare Turnstile dari widget di halaman. Wajib bila verifikasi captcha aktif.',
  })
  @IsOptional()
  @IsString()
  // OPSIONAL di DTO, WAJIB di gerbangnya. Menjadikannya wajib di sini akan
  // memaksa lingkungan pengembangan yang captcha-nya sengaja mati ikut
  // mengirim token karangan, dan menolaknya dengan 400 yang menyesatkan
  // ("captchaToken should not be empty") alih-alih 403 yang menyebut sebabnya.
  captchaToken?: string;

  @ApiProperty({
    description: 'Persetujuan pemrosesan data pribadi (UU PDP No. 27/2022). Wajib true.',
  })
  @IsBoolean()
  @Equals(true, { message: 'Persetujuan pemrosesan data pribadi wajib diberikan' })
  setuju: boolean;

  @ApiPropertyOptional({
    maxLength: 50,
    description: 'Nama pengisi. Kosong bila ia memilih tanpa data diri',
  })
  @IsOptional()
  @IsString()
  // Batas atas 50 menyamai `users.nama` dan kolom `survey_responses.nama`, jadi
  // nilai yang lolos di sini tak pernah terpotong basis data. Batas bawah 2
  // menolak nama satu huruf, yang selalu isian tak sengaja.
  @Length(2, 50)
  nama?: string;

  @ApiPropertyOptional({
    description: 'Nomor HP pengisi (08xx, 628xx, atau +628xx). Kosong bila tanpa data diri',
  })
  @IsOptional()
  @IsString()
  @Matches(NOMOR_HP_REGEX, {
    message: 'Nomor HP tidak dikenali. Contoh bentuk yang diterima: 081234567890',
  })
  nomorHp?: string;

  @ApiPropertyOptional({
    enum: JenisKelamin,
    description: 'Kosong bila pengisi memilih tanpa data diri',
  })
  @IsOptional()
  @IsEnum(JenisKelamin)
  jenisKelamin?: JenisKelamin;

  @ApiPropertyOptional({
    enum: KELOMPOK_UMUR,
    description: 'Kosong bila pengisi memilih tanpa data diri',
  })
  @IsOptional()
  @IsIn(KELOMPOK_UMUR)
  kelompokUmur?: string;
}
