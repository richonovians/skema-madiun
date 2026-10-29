import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AllExceptionsFilter } from './all-exceptions.filter';

/**
 * Filter ini dilewati SETIAP respons galat aplikasi, jadi perubahan padanya
 * berisiko luas. Berkas ini ditambahkan 5 September 2026 bersama kemampuan
 * meneruskan kode galat khas -- dengan kontrol bahwa perilaku lamanya (kode =
 * nama status HTTP) tetap utuh untuk exception yang tak menyebutkan kode.
 */
function tangkap(exception: unknown): {
  status: number;
  body: { message: string; error: { code: string; details: unknown } };
} {
  let status = 0;
  let body: unknown = null;
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/v1/uji', method: 'GET' }),
      getResponse: () => ({
        status: (kode: number) => {
          status = kode;
          return { json: (isi: unknown) => (body = isi) };
        },
      }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);
  return { status, body: body as ReturnType<typeof tangkap>['body'] };
}

describe('AllExceptionsFilter', () => {
  it('meneruskan kode galat KHAS yang disebutkan exception', () => {
    const hasil = tangkap(
      new UnauthorizedException({
        message: 'Peran yang ingin dipakai belum dipilih',
        code: 'ROLE_SELECTION_REQUIRED',
      }),
    );

    expect(hasil.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(hasil.body.error.code).toBe('ROLE_SELECTION_REQUIRED');
    expect(hasil.body.message).toBe('Peran yang ingin dipakai belum dipilih');
  });

  /**
   * KONTROL, dan inilah yang membuat uji di atas bermakna: dua keadaan yang
   * sama-sama 401 harus dapat DIBEDAKAN. Kalau uji ini juga menghasilkan
   * 'ROLE_SELECTION_REQUIRED', berarti filternya menandai semua 401 dan klien
   * tetap tak bisa membedakan apa pun.
   */
  it('KONTROL: 401 biasa tetap berkode UNAUTHORIZED', () => {
    const hasil = tangkap(new UnauthorizedException('Autentikasi diperlukan'));

    expect(hasil.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(hasil.body.error.code).toBe('UNAUTHORIZED');
  });

  it('403 tetap berkode FORBIDDEN', () => {
    const hasil = tangkap(new ForbiddenException('Tidak boleh'));

    expect(hasil.status).toBe(HttpStatus.FORBIDDEN);
    expect(hasil.body.error.code).toBe('FORBIDDEN');
  });

  it('galat validasi (message array) tetap dirangkum & detailnya utuh', () => {
    const hasil = tangkap(new BadRequestException(['nama wajib', 'email tidak valid']));

    expect(hasil.status).toBe(HttpStatus.BAD_REQUEST);
    expect(hasil.body.message).toBe('Validation failed');
    expect(hasil.body.error.details).toEqual(['nama wajib', 'email tidak valid']);
  });

  /**
   * BUG-059 (29 Oktober 2026): pesan galat tak terduga TIDAK sampai ke klien.
   * Sebelumnya `exception.message` dikirim apa adanya, dan pesan Prisma memuat
   * jalur berkas absolut di server, potongan kode sumber, dan bentuk kuerinya.
   * Pesan di bawah disalin dari PrismaClientValidationError sungguhan.
   */
  it('galat tak terduga (bukan HttpException) -> 500 berpesan umum, pesan aslinya tidak dikirim', () => {
    const hasil = tangkap(new Error('sesuatu pecah'));

    expect(hasil.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(hasil.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(hasil.body.message).toBe('Terjadi kesalahan pada server.');
  });

  it('galat Prisma tak membocorkan jalur berkas, kode sumber, maupun kueri', () => {
    const galat = new Prisma.PrismaClientValidationError(
      [
        'Invalid `this.prisma.auditLog.findMany()` invocation in',
        'E:\\server\\apps\\api\\src\\modules\\audit\\audit.service.ts:57:12',
        '',
        '→ 57 this.prisma.auditLog.findMany({ where: { createdAt: { gte: new Date("Invalid Date") } } })',
        'Invalid value for argument `gte`: Provided Date object is invalid. Expected Date.',
      ].join('\n'),
      { clientVersion: '6.19.3' },
    );

    const hasil = tangkap(galat);
    const teks = JSON.stringify(hasil.body);

    expect(hasil.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(teks).not.toMatch(/audit\.service\.ts|invocation|findMany|createdAt|E:\\\\server/);
  });

  it('KONTROL: pesan dan stack aslinya tetap dicatat ke log server', () => {
    const catat = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const galat = new Error('sesuatu pecah');

    tangkap(galat);

    expect(catat).toHaveBeenCalledWith(expect.stringContaining('sesuatu pecah'), galat.stack);
    catat.mockRestore();
  });

  /**
   * Penolakan multer MENTAH -- yang lolos dari `transformException` milik
   * @nestjs/platform-express karena kalimatnya tak ada di tabel Nest -- sampai
   * ke sini sebagai Error biasa dan karena itu dijawab 500. Itu galat KLIEN
   * yang disajikan sebagai kerusakan server. Aturannya ada di
   * multer-galat.util.ts; di sini yang diuji hanya penyambungannya.
   */
  it('penolakan multer mentah -> 400 berkode kode multer, bukan 500', () => {
    const hasil = tangkap(
      new MulterError(
        'LIMIT_UNEXPECTED_FILE' as ConstructorParameters<typeof MulterError>[0],
        'foto',
      ),
    );

    expect(hasil.status).toBe(HttpStatus.BAD_REQUEST);
    expect(hasil.body.error.code).toBe('LIMIT_UNEXPECTED_FILE');
    expect(hasil.body.message).toContain('foto');
  });

  it('`code` bukan string diabaikan, bukan diteruskan mentah', () => {
    const hasil = tangkap(new ForbiddenException({ message: 'x', code: 42 }));

    expect(hasil.body.error.code).toBe('FORBIDDEN');
  });
});
