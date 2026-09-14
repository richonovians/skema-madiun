import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALAMAT_VERIFIKASI = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface JawabanTurnstile {
  success?: boolean;
  'error-codes'?: string[];
}

/**
 * Verifikasi token Cloudflare Turnstile (14 September 2026).
 *
 * DUA sambungan terlibat, dan yang kedua sering terlewat:
 *
 * 1. peramban pengunjung memuat widget dari Cloudflare -- memakai internet
 *    pengunjung, server ini tak terlibat;
 * 2. server INI bertanya balik ke Cloudflare apakah token yang dibawa
 *    pengunjung asli.
 *
 * Sambungan kedua berarti server melakukan permintaan KELUAR. Di jaringan yang
 * keluarnya dibatasi, jalur itu bisa tertutup -- dan gejalanya menyesatkan:
 * kotak captcha muncul serta lolos dengan normal di layar pengunjung, tetapi
 * setiap pengiriman ditolak. Periksa dengan:
 *
 *   curl -s -m 10 -o /dev/null -w "%{http_code}\n" \
 *     -d "secret=uji&response=uji" \
 *     https://challenges.cloudflare.com/turnstile/v0/siteverify
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly rahasia: string;

  constructor(config: ConfigService) {
    this.rahasia = config.get<string>('turnstile.secretKey') ?? '';

    /**
     * Rahasia kosong MEMATIKAN verifikasi, supaya pengembangan tak menuntut
     * akun Cloudflare. Kemudahan itu akan berubah menjadi lubang bila terbawa
     * ke produksi: `.env` yang lupa diisi mematikan captcha tanpa satu pun
     * pesan galat, semuanya tampak normal, dan tak ada yang tahu pelindungnya
     * tidak ada.
     *
     * Karena itu aplikasinya menolak menyala, bukan sekadar memperingatkan.
     * Peringatan di log akan tenggelam persis pada hari ia paling dibutuhkan.
     */
    if (!this.rahasia && config.get<string>('app.nodeEnv') === 'production') {
      throw new Error(
        'TURNSTILE_SECRET_KEY wajib diisi di produksi — tanpa itu captcha mati tanpa pemberitahuan.',
      );
    }
  }

  /** `true` bila verifikasinya mati (di luar produksi) atau tokennya sah. */
  async verifikasi(token: string | undefined, ip: string | undefined): Promise<boolean> {
    if (!this.rahasia) {
      return true;
    }
    if (!token) {
      // Tak perlu menghubungi Cloudflare untuk sesuatu yang pasti ditolaknya.
      return false;
    }

    const body = new URLSearchParams({ secret: this.rahasia, response: token });
    if (ip) {
      // Dipakai Cloudflare untuk menilai tokennya; tanpa ini penilaiannya
      // kehilangan sinyal yang paling berguna.
      body.set('remoteip', ip);
    }

    try {
      const res = await fetch(ALAMAT_VERIFIKASI, { method: 'POST', body });
      const hasil = (await res.json()) as JawabanTurnstile;
      if (!hasil.success) {
        this.logger.debug(`Token Turnstile ditolak: ${(hasil['error-codes'] ?? []).join(', ')}`);
      }
      return hasil.success === true;
    } catch (err) {
      /**
       * Cloudflare tak terjangkau. DITOLAK, bukan diloloskan.
       *
       * Meloloskan terasa ramah -- warga tetap bisa mengirim -- tetapi artinya
       * captcha-nya mati tanpa seorang pun tahu, justru pada saat yang paling
       * mungkin disalahgunakan. Dicatat sebagai ERROR supaya pemadaman jalur
       * keluar terlihat di log, bukan hanya terasa sebagai keluhan warga.
       */
      this.logger.error(
        `Verifikasi Turnstile gagal dihubungi: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
