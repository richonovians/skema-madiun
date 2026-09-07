import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SsoProfile, SsoSource } from '../interfaces/sso-source.interface';

/** Bagian dokumen penemuan OIDC yang kita pakai (bukan seluruh field). */
interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  error?: string;
}

/**
 * Percakapan OAuth2 nyata dengan SSO Helpdesk.
 *
 * DIVERIFIKASI terhadap penyedia sungguhan (2026-08-27), bukan diasumsikan:
 *
 * - `<issuer>/.well-known/openid-configuration` tersedia dan memuat ketiga
 *   endpoint. Karena itu endpoint TIDAK ditulis di env — cukup issuer.
 * - `POST <token_endpoint>` menuntut `client_id`, `client_secret`, `code`, dan
 *   `redirect_uri` di dalam BODY (gaya `client_secret_post`), dibuktikan oleh
 *   balasan galatnya sendiri:
 *     {"error":"missing required fields: client_id, client_secret, code, redirect_uri"}
 *   `client_secret_basic` juga didukung menurut dokumen penemuan, tapi body
 *   dipilih karena itulah bentuk yang sudah terbukti diterima.
 * - `GET <userinfo_endpoint>` memakai bearer token biasa; tanpa token ia menjawab
 *   {"error":"missing or invalid bearer token"}.
 * - `GET <authorization_endpoint>` mengalihkan pengguna ke
 *   `https://helpdesk.madiunkab.go.id/login`, jadi halaman login yang dilihat
 *   pengguna memang milik Helpdesk, bukan SKM.
 *
 * PKCE TIDAK dipakai: `code_challenge_methods_supported` tak dicantumkan dokumen
 * penemuan. Pertahanan CSRF sepenuhnya bersandar pada `state` — lihat
 * SsoStateService.
 *
 * ID token TIDAK diverifikasi di sini. Profil diambil dari `userinfo_endpoint`
 * memakai access token, jalur yang tak menuntut verifikasi tanda tangan lokal
 * karena kepercayaannya berasal dari koneksi TLS ke penyedia itu sendiri. JWKS
 * (`<issuer>/jwks`, RS256, kid `sso-key-1`) baru dibutuhkan bila kelak kita
 * memilih membaca klaim langsung dari ID token.
 */
@Injectable()
export class HelpdeskSsoClient implements SsoSource {
  private readonly logger = new Logger(HelpdeskSsoClient.name);

  /**
   * Dokumen penemuan di-cache seumur proses: isinya konfigurasi penyedia yang
   * praktis tak berubah, dan mengambilnya ulang pada setiap login berarti dua
   * kali perjalanan jaringan untuk satu login.
   */
  private discovery: OidcDiscovery | null = null;

  constructor(private readonly config: ConfigService) {}

  async buildAuthorizeUrl(state: string): Promise<string> {
    const { authorization_endpoint } = await this.getDiscovery();
    const url = new URL(authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.required('helpdesk.ssoClientId'));
    url.searchParams.set('redirect_uri', this.required('helpdesk.ssoRedirectUri'));
    url.searchParams.set('scope', this.config.get<string>('helpdesk.ssoScopes') ?? 'openid');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForProfile(code: string): Promise<SsoProfile> {
    const { token_endpoint, userinfo_endpoint } = await this.getDiscovery();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.required('helpdesk.ssoClientId'),
      client_secret: this.required('helpdesk.ssoClientSecret'),
      redirect_uri: this.required('helpdesk.ssoRedirectUri'),
    });

    const tokenRes = await this.fetchOrFail(token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const tokens = (await tokenRes.json()) as TokenResponse;
    if (!tokens.access_token) {
      // Pesan galat penyedia diteruskan supaya penyebabnya terlihat di log
      // (mis. "invalid client_id", "invalid code") -- bukan ditelan jadi 500.
      throw new ServiceUnavailableException(
        `Helpdesk tidak mengembalikan access_token${tokens.error ? `: ${tokens.error}` : ''}`,
      );
    }

    const infoRes = await this.fetchOrFail(userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
    });
    const claims = (await infoRes.json()) as Record<string, unknown>;

    const sub = typeof claims.sub === 'string' ? claims.sub : null;
    if (!sub) {
      // Tanpa `sub` tak ada identitas stabil untuk dicocokkan; melanjutkan berarti
      // membuat akun yatim setiap kali login.
      throw new ServiceUnavailableException('Profil SSO Helpdesk tanpa klaim `sub`');
    }

    return {
      sub,
      email: typeof claims.email === 'string' ? claims.email : null,
      // Hanya boolean sejati yang dipercaya. Beberapa penyedia mengirimkannya
      // sebagai string "true"/"false"; itu diterima juga, tapi bentuk lain
      // (angka, kosong, tak ada) menjadi `null` = belum diketahui, BUKAN false
      // -- pembedaan itu yang menentukan apakah sakelar darurat berlaku.
      emailVerified: normalizeVerified(claims.email_verified),
      nama: pickName(claims),
      groups: claims.groups,
      role: claims.role,
    };
  }

  private async getDiscovery(): Promise<OidcDiscovery> {
    if (this.discovery) {
      return this.discovery;
    }
    const issuer = this.required('helpdesk.ssoIssuer').replace(/\/+$/, '');
    const url = `${issuer}/.well-known/openid-configuration`;

    const res = await this.fetchOrFail(url, { headers: { Accept: 'application/json' } });
    const doc = (await res.json()) as Partial<OidcDiscovery>;

    if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.userinfo_endpoint) {
      throw new ServiceUnavailableException(
        'Dokumen penemuan OIDC Helpdesk tidak memuat ketiga endpoint yang dibutuhkan',
      );
    }

    this.discovery = {
      authorization_endpoint: doc.authorization_endpoint,
      token_endpoint: doc.token_endpoint,
      userinfo_endpoint: doc.userinfo_endpoint,
    };
    this.logger.log(`Dokumen penemuan OIDC Helpdesk dimuat dari ${url}`);
    return this.discovery;
  }

  /**
   * Balasan non-JSON diperlakukan sebagai gangguan jaringan, BUKAN galat program.
   *
   * Alasannya konkret: host `api.madiunkab.go.id` berada di belakang Cloudflare,
   * dan tantangan keamanannya pernah menjawab permintaan dari server dengan 403
   * berisi halaman HTML ±720 KB (teramati 25 Agustus 2026, lalu hilang sendiri
   * pada hari yang sama). Bila itu terulang, `res.json()` akan melempar galat
   * parse yang menyesatkan; di sini ia dikenali lebih dulu dan dilaporkan apa
   * adanya, sehingga log menunjuk penyebab sebenarnya.
   */
  private async fetchOrFail(url: string, init?: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      throw new ServiceUnavailableException(
        `Tidak dapat menghubungi Helpdesk (${url}): ${String(err)}`,
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      this.logger.error(
        `Balasan bukan JSON dari ${url} — HTTP ${res.status}, content-type "${contentType}". ` +
          'Bila HTML, kemungkinan besar halaman tantangan Cloudflare, bukan jawaban aplikasi.',
      );
      throw new ServiceUnavailableException(
        `Helpdesk membalas ${res.status} dengan tipe "${contentType || 'tak diketahui'}", bukan JSON`,
      );
    }

    // Status non-ok TIDAK langsung dilempar bila JSON: endpoint token memakai 400
    // untuk menyampaikan galat OAuth yang informatif, dan pemanggil di atas yang
    // membacanya.
    return res;
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(`Konfigurasi SSO "${key}" belum diisi`);
    }
    return value;
  }
}

/**
 * Nama diambil berurutan dari `name`, lalu `preferred_username`, lalu `nickname`
 * — ketiganya tercantum pada `claims_supported` Helpdesk, tapi tak ada jaminan
 * mana yang benar-benar terisi.
 */
/** `true`/`false` bila klaimnya tegas, `null` bila tak ada atau tak dikenali. */
function normalizeVerified(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
}

function pickName(claims: Record<string, unknown>): string | null {
  for (const key of ['name', 'preferred_username', 'nickname']) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
