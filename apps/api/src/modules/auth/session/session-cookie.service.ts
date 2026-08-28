import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { readCookie } from './cookie.util';

/**
 * Nama cookie sesi. SENGAJA BUKAN `token`: cookie bernama `token` sudah dipakai
 * jalur dev-login dan ditulis oleh JavaScript frontend (authStorage.js). Kalau
 * keduanya memakai nama yang sama, peramban bisa menyimpan DUA cookie `token`
 * (satu HttpOnly dari API, satu biasa dari frontend) yang tak dapat dibedakan
 * pada header `Cookie` — dan mana yang menang bergantung urutan, bukan aturan.
 */
export const SESSION_COOKIE = 'session';

/** Cadangan bila token tak punya klaim `exp` (seharusnya tak pernah terjadi). */
const FALLBACK_TTL_SECONDS = 24 * 3600;

/**
 * Penerbit cookie sesi HttpOnly — cara penyerahan token pilihan untuk alur SSO.
 *
 * KENAPA COOKIE, BUKAN FRAGMENT URL: rancangan sebelumnya menitipkan token pada
 * `#token=` lalu frontend memindahkannya ke localStorage. Itu berfungsi, tapi
 * token sesi menjadi dapat dibaca JavaScript mana pun yang berjalan di halaman —
 * satu XSS berarti token dapat dibawa keluar dan dipakai dari mesin lain sampai
 * kedaluwarsa. Dengan `HttpOnly`, XSS masih bisa MEMAKAI sesi (peramban tetap
 * melampirkan cookie), tapi tak bisa MENYALIN tokennya.
 *
 * ATRIBUT & ALASANNYA:
 * - `HttpOnly`  — inti keputusan di atas.
 * - `SameSite=Lax` — bukan Strict. Cookie ini harus terkirim pada navigasi
 *   tingkat atas yang datang dari Helpdesk (callback), dan frontend memanggil API
 *   lintas-ORIGIN tapi masih satu SITUS di produksi (skm.* → api.*, satu domain
 *   terdaftar madiunkab.go.id), sehingga Lax cukup. Strict akan menahan cookie
 *   pada callback dan membuat setiap login gagal. `None` tak dipakai karena tak
 *   dibutuhkan dan menuntut `Secure` mutlak.
 * - `Path=/`    — beda dari cookie `state` yang dipersempit. Cookie ini memang
 *   harus ikut pada SETIAP panggilan API.
 * - `Secure`    — hanya di production; di dev frontend berjalan di http://localhost
 *   dan `Secure` akan membuat cookie tak pernah tersimpan.
 * - `Domain`    — lihat `SESSION_COOKIE_DOMAIN` di configuration.ts. Kosong di dev
 *   (host `localhost` sama untuk :3000 & :3001 karena cookie mengabaikan port),
 *   WAJIB diisi di produksi supaya cookie yang disetel `api.madiunkab.go.id`
 *   ikut terkirim ke `skm.madiunkab.go.id` — tanpa itu proxy.js (Next.js, sisi
 *   server) tak dapat membaca sesi dan setiap halaman terjaga akan memantulkan
 *   pengguna yang sebenarnya sudah masuk.
 *
 * `Max-Age` diambil dari klaim `exp` TOKEN ITU SENDIRI, bukan dihitung ulang dari
 * `session.ttlHours`. Menghitungnya dua kali dari sumber yang sama tetap membuka
 * peluang cookie hidup lebih lama daripada tokennya (atau sebaliknya) begitu satu
 * tempat diubah dan yang lain terlupa.
 */
@Injectable()
export class SessionCookieService {
  private readonly logger = new Logger(SessionCookieService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Header Set-Cookie yang MENYIMPAN sesi. */
  build(token: string): string {
    const maxAge = Math.max(1, this.expiresAt(token) - Math.floor(Date.now() / 1000));
    return this.serialize(token, maxAge);
  }

  /** Header Set-Cookie yang MENGHAPUS sesi — dipakai `POST /auth/logout`. */
  clear(): string {
    return this.serialize('', 0);
  }

  /** Token sesi dari header `Cookie`, atau null. */
  read(cookieHeader: string | undefined): string | null {
    return readCookie(cookieHeader, SESSION_COOKIE);
  }

  /**
   * Detik epoch saat sesi kedaluwarsa.
   *
   * Ikut dikirim ke frontend (fragment `#expires=`) supaya antarmuka tahu kapan
   * berhenti menampilkan keadaan "sudah masuk". Frontend tak dapat mengetahuinya
   * sendiri lagi: dulu ia mendekode `exp` dari token di localStorage, dan kini
   * token itu HttpOnly. Nilai ini BUKAN rahasia — ia hanya sebuah waktu, dan
   * tidak memberi kemampuan apa pun kepada yang membacanya.
   */
  expiresAt(token: string): number {
    const decoded: unknown = this.jwtService.decode(token);
    const exp =
      decoded && typeof decoded === 'object' ? (decoded as { exp?: unknown }).exp : undefined;
    if (typeof exp === 'number') {
      return exp;
    }
    this.logger.warn('Token sesi tanpa klaim `exp` — umur cookie memakai nilai cadangan');
    return Math.floor(Date.now() / 1000) + FALLBACK_TTL_SECONDS;
  }

  private serialize(value: string, maxAgeSeconds: number): string {
    const parts = [`${SESSION_COOKIE}=${value}`, 'Path=/', `Max-Age=${maxAgeSeconds}`, 'HttpOnly'];

    const domain = this.config.get<string>('session.cookieDomain');
    if (domain) {
      parts.push(`Domain=${domain}`);
    }
    parts.push('SameSite=Lax');
    if (this.config.get<string>('app.nodeEnv') === 'production') {
      parts.push('Secure');
    }
    return parts.join('; ');
  }
}
