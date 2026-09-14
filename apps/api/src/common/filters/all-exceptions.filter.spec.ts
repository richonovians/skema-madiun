import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
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

  it('galat tak terduga (bukan HttpException) -> 500 tanpa membocorkan apa pun selain pesannya', () => {
    const hasil = tangkap(new Error('sesuatu pecah'));

    expect(hasil.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(hasil.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(hasil.body.message).toBe('sesuatu pecah');
  });

  it('`code` bukan string diabaikan, bukan diteruskan mentah', () => {
    const hasil = tangkap(new ForbiddenException({ message: 'x', code: 42 }));

    expect(hasil.body.error.code).toBe('FORBIDDEN');
  });
});
