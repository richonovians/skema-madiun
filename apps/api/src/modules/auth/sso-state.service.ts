import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { readCookie } from './session/cookie.util';

// Diekspor ulang demi kompatibilitas: `readCookie` dulu didefinisikan DI SINI dan
// diimpor dari sini oleh berkas lain (termasuk test). Definisinya kini di
// session/cookie.util.ts karena pemakainya bertambah — lihat catatan di sana.
export { readCookie };

/** Payload token `state` — sengaja TANPA `sub`, lihat SessionService.verify. */
interface StatePayload {
  typ: typeof STATE_TYP;
  n: string;
}

const STATE_TYP = 'sso_state';

/** Nama cookie penampung token `state`. */
export const SSO_STATE_COOKIE = 'sso_state';

/**
 * Umur `state` — cukup untuk pengguna mengetik kredensial di Helpdesk, tapi
 * sesingkat mungkin. 10 menit.
 */
const STATE_TTL_SECONDS = 600;

/**
 * Path cookie DIPERSEMPIT ke rute callback saja: cookie ini tak punya urusan
 * dengan request lain, dan mempersempit path berarti ia tidak ikut terkirim pada
 * setiap panggilan API.
 */
const STATE_COOKIE_PATH = '/api/v1/auth/sso';

/**
 * Penerbit & pemverifikasi parameter `state` OAuth2 — pertahanan CSRF alur login.
 *
 * KENAPA INI KRITIS DI PROYEK INI: dokumen penemuan Helpdesk TIDAK mencantumkan
 * `code_challenge_methods_supported`, jadi PKCE diduga tak tersedia. Pada alur
 * tanpa PKCE, `state` bukan lapisan kedua melainkan SATU-SATUNYA yang mencegah
 * penyerang menjahitkan `code` miliknya ke sesi korban. Karena itu ia dibuat
 * bertanda tangan, sekali pakai, dan berumur pendek — bukan sekadar angka acak
 * yang disimpan lalu dilupakan.
 *
 * CARA KERJA (pengikatan cookie ↔ query):
 *   1. `issue()` membuat nonce acak 32 byte. Nonce itu dikirim ke Helpdesk sebagai
 *      `?state=`, sementara bentuk BERTANDA-TANGAN-nya disimpan sebagai cookie.
 *   2. `verify()` menuntut keduanya cocok. Penyerang bisa mengarang `?state=` di
 *      URL, tapi tak bisa mengarang cookie bertanda tangan yang sepadan — dan
 *      tak bisa menulis cookie ke peramban korban untuk domain ini.
 *
 * Ditandatangani JwtService yang sama dengan token sesi (tak perlu kunci kedua),
 * tapi payload-nya diberi penanda `typ` dan TANPA `sub`, sehingga token `state`
 * tak mungkin tertukar menjadi token sesi. Lihat SessionService.verify.
 */
@Injectable()
export class SsoStateService {
  private readonly logger = new Logger(SsoStateService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** @returns `state` untuk query Helpdesk + nilai header Set-Cookie pendampingnya. */
  issue(): { state: string; setCookie: string } {
    const nonce = randomBytes(32).toString('hex');
    const signed = this.jwtService.sign({ typ: STATE_TYP, n: nonce } satisfies StatePayload, {
      expiresIn: STATE_TTL_SECONDS,
    });
    return { state: nonce, setCookie: this.buildCookie(signed, STATE_TTL_SECONDS) };
  }

  /**
   * @param stateFromQuery nilai `?state=` yang dikembalikan Helpdesk
   * @param cookieHeader isi mentah header `Cookie` dari request
   */
  verify(stateFromQuery: string | undefined, cookieHeader: string | undefined): boolean {
    if (!stateFromQuery) {
      this.logger.warn('Callback SSO tanpa parameter state');
      return false;
    }

    const signed = readCookie(cookieHeader, SSO_STATE_COOKIE);
    if (!signed) {
      // Penyebab paling sering BUKAN serangan: cookie hilang karena SameSite.
      // Callback SSO adalah navigasi lintas-situs dari Helpdesk, sehingga cookie
      // ber-SameSite=Strict TIDAK akan terkirim. Lihat buildCookie().
      this.logger.warn('Callback SSO tanpa cookie state (kedaluwarsa, atau terblokir SameSite)');
      return false;
    }

    let payload: Partial<StatePayload>;
    try {
      payload = this.jwtService.verify<Partial<StatePayload>>(signed);
    } catch (err) {
      this.logger.warn(`Cookie state tidak sah/kedaluwarsa: ${String(err)}`);
      return false;
    }

    if (payload?.typ !== STATE_TYP || typeof payload.n !== 'string') {
      this.logger.warn('Cookie state bertanda-tangan sah tapi bukan token state');
      return false;
    }

    if (payload.n !== stateFromQuery) {
      this.logger.warn('State pada query tidak cocok dengan cookie — permintaan ditolak');
      return false;
    }

    return true;
  }

  /** Header Set-Cookie yang MENGHAPUS cookie state — dipanggil setelah verifikasi (sekali pakai). */
  clearCookie(): string {
    return this.buildCookie('', 0);
  }

  private buildCookie(value: string, maxAgeSeconds: number): string {
    const parts = [
      `${SSO_STATE_COOKIE}=${value}`,
      `Path=${STATE_COOKIE_PATH}`,
      `Max-Age=${maxAgeSeconds}`,
      'HttpOnly',
      // Lax, BUKAN Strict — disengaja. Callback datang sebagai navigasi tingkat
      // atas dari domain Helpdesk; Strict akan menahan cookie sehingga SETIAP
      // login gagal. Lax tetap menutup pengiriman pada request lintas-situs
      // non-navigasi, yang memang tak dibutuhkan cookie ini.
      'SameSite=Lax',
    ];
    if (this.config.get<string>('app.nodeEnv') === 'production') {
      parts.push('Secure');
    }
    return parts.join('; ');
  }
}
