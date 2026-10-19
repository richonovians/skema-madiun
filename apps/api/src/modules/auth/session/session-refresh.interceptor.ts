import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SESSION_COOKIE, SessionCookieService } from './session-cookie.service';
import { SessionService } from './session.service';

/**
 * Waktu berakhirnya sesi SESUDAH diperpanjang, detik epoch.
 *
 * Perlu dikirim karena antarmuka memutuskan menampilkan keadaan "sudah masuk"
 * dari `sso_expires_at` di localStorage, sementara tokennya sendiri HttpOnly dan
 * tak dapat dibaca JavaScript. Tanpa header ini, cookie diperpanjang diam-diam
 * di server sedangkan antarmuka tetap memakai waktu lama, lalu menyatakan sesi
 * habis padahal baru saja disegarkan.
 *
 * Isinya hanya sebuah waktu. Ia tak memberi kemampuan apa pun kepada yang
 * membacanya, sama seperti fragment `#expires=` pada alamat callback SSO.
 */
export const HEADER_SESI_BERAKHIR = 'X-Sesi-Berakhir';

/**
 * Memperpanjang jendela menganggur sesi selama pemiliknya masih memakainya
 * (17 September 2026, laporan pengguna: "session kemarin masih bisa dipakai
 * hingga hari ini").
 *
 * Jendela pendek tanpa perpanjangan memindahkan keluhannya, bukan
 * menyelesaikannya: pengguna yang sedang bekerja akan terlempar keluar di
 * tengah mengisi formulir. Yang dibutuhkan adalah sesi yang hidup selama
 * dipakai dan mati ketika ditinggal, dengan pagu mutlak supaya ia tetap punya
 * umur maksimum (lihat klaim `abs` di SessionService).
 *
 * TIGA BATAS yang dijaga ketat, masing-masing karena sebab yang nyata:
 *
 * 1. Hanya jalur cookie. Jalur `dev-login` memegang tokennya di localStorage
 *    milik frontend; menuliskan cookie untuknya membuat dua sumber kebenaran
 *    yang dapat berbeda isi.
 * 2. Tidak pernah menimpa `Set-Cookie` yang sudah ditulis handler. `logout`
 *    menyetel cookie kosong untuk mengakhiri sesi -- menimpanya berarti
 *    menerbitkan kembali sesi yang baru saja dimatikan, tanpa satu pun galat
 *    yang terlihat. Diperiksa dari isi header responsnya, bukan dari daftar
 *    rute, supaya rute baru yang mengelola cookienya sendiri ikut aman tanpa
 *    ada yang perlu mengingat menambahkannya ke daftar.
 * 3. Hanya ketika sisa jendelanya sudah tinggal separuh. Memperbarui pada
 *    setiap permintaan berarti satu `Set-Cookie` per permintaan tanpa manfaat.
 */
@Injectable()
export class SessionRefreshInterceptor implements NestInterceptor {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(tap(() => this.perpanjangBilaPerlu(context)));
  }

  private perpanjangBilaPerlu(context: ExecutionContext): void {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers?: Record<string, unknown> }>();
    const response = http.getResponse<{
      getHeader: (nama: string) => unknown;
      setHeader: (nama: string, nilai: unknown) => void;
    }>();

    const cookieHeader = request?.headers?.cookie;
    const token = this.sessionCookie.read(
      typeof cookieHeader === 'string' ? cookieHeader : undefined,
    );
    if (!token) {
      return;
    }
    if (this.handlerSudahMenulisCookieSesi(response)) {
      return;
    }
    if (!this.sessionService.perluDiperpanjang(token)) {
      return;
    }

    const payload = this.sessionService.verify(token);
    if (!payload) {
      return;
    }
    const baru = this.sessionService.perpanjang(payload);
    if (!baru) {
      return;
    }

    response.setHeader('Set-Cookie', this.sessionCookie.build(baru));
    response.setHeader(HEADER_SESI_BERAKHIR, String(this.sessionCookie.expiresAt(baru)));
  }

  private handlerSudahMenulisCookieSesi(response: {
    getHeader: (nama: string) => unknown;
  }): boolean {
    const terpasang = response.getHeader('Set-Cookie');
    const daftar = Array.isArray(terpasang) ? terpasang : [terpasang];
    return daftar.some(
      (baris) => typeof baris === 'string' && baris.startsWith(`${SESSION_COOKIE}=`),
    );
  }
}
