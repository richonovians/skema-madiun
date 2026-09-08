import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { ASSIGNABLE_ROLES } from './create-user.dto';

/**
 * Penyuntingan akun dari SKEMA — HANYA `roles`.
 *
 * KEPEMILIKAN DATA (permintaan pengguna 8 September 2026): `nama`, `email`, dan
 * `opdId` berasal dari Helpdesk. Kata penggunanya: "tim saya tidak bisa mengubah
 * data yang berasal dari helpdesk dan misal tim saya bisa mengubah data dari
 * helpdesk akan membuat data teracak-acak. Jadi yang bisa diubah hanya role pada
 * SKEMA saja."
 *
 * `nama` DIBUANG dari sini, dan itu membalik keputusan 5 September 2026 yang
 * sengaja mempertahankannya ("penguncian itu ada di halaman, bukan di API")
 * justru supaya klien lama tak menerima 400. Sekarang 400 itulah yang
 * diinginkan: aturan kepemilikan yang hanya hidup di satu halaman bukan aturan,
 * melainkan kebiasaan — dan halaman berikutnya yang lupa menirunya akan
 * menimpa data Helpdesk tanpa satu pun penjaga.
 *
 * `opdId` DIBUANG dengan alasan yang lebih keras lagi: ia menentukan Admin OPD
 * mana yang dipegang seseorang, dan sejak 8 September 2026 hanya login SSO yang
 * boleh menulisnya (SsoService.acceptLogin). Membiarkannya di sini berarti dua
 * penulis untuk satu kolom, dan yang kalah selalu Helpdesk — karena
 * penyuntingan manual terjadi kapan saja, sedangkan sinkronisasi hanya saat
 * login.
 *
 * `isActive` TIDAK di sini karena ia punya endpointnya sendiri
 * (`PATCH /users/:id/status`), dan ia memang milik SKEMA: menonaktifkan akun di
 * SKEMA adalah keputusan SKEMA, bukan cerminan keadaan di Helpdesk.
 *
 * `ValidationPipe` memakai `forbidNonWhitelisted`, jadi mengirim `nama` atau
 * `opdId` ke sini menghasilkan 400 — bukan diabaikan diam-diam. Itu pilihan:
 * permintaan yang ditolak terlihat, permintaan yang diabaikan tidak.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    enum: ASSIGNABLE_ROLES,
    isArray: true,
    description:
      'Himpunan role akun. Minimal satu. Hanya superuser yang boleh mengubahnya, dan ' +
      'tidak untuk akunnya sendiri (cegah self-lockout). Satu-satunya field yang ' +
      'dapat diubah dari SKEMA — nama, email & OPD berasal dari Helpdesk.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(ASSIGNABLE_ROLES, { each: true })
  roles?: Role[];
}
