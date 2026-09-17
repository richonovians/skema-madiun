import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

export interface SessionPayload {
  sub: number; // userId
  /**
   * Peran yang DIPILIH pemilik sesi (5 September 2026). Opsional: akun ber-role
   * tunggal tak perlu memilih apa pun.
   *
   * Menyimpan pilihan ini di token TIDAK melanggar keputusan "payload minimal"
   * di bawah. Yang tak boleh dipercaya dari token adalah KEPEMILIKAN role, dan
   * itu tetap dibaca ulang dari basis data pada setiap permintaan; klaim ini
   * hanya menyatakan PILIHAN, lalu disaring oleh kepemilikan itu
   * (`resolveActingRole`). Karena itu mencabut role tetap berlaku seketika.
   */
  act?: Role;
  /**
   * BATAS MUTLAK sesi, detik epoch (17 September 2026). Dihitung sekali saat
   * login dan tak pernah bergeser, berapa kali pun jendela menganggur
   * diperbarui. Tanpa klaim ini, memperbarui `exp` pada tiap permintaan membuat
   * sesi orang yang membuka aplikasi tiap hari tak pernah berakhir.
   *
   * Opsional karena token yang diterbitkan SEBELUM perubahan ini tak memilikinya.
   * Token semacam itu dibiarkan habis menurut umur lamanya, bukan diperpanjang.
   */
  abs?: number;
  /** Diisi JWT sendiri; dibaca untuk menghitung sisa jendela menganggur. */
  exp?: number;
}

/**
 * Sisa jendela di bawah ambang ini memicu perpanjangan. Setengah jendela
 * dipilih supaya perpanjangan tidak terjadi pada SETIAP permintaan (satu
 * Set-Cookie per permintaan, tanpa manfaat apa pun) sekaligus tak menunggu
 * sampai nyaris habis, yang membuat sesi mati di tengah pekerjaan hanya karena
 * permintaan terakhirnya kebetulan sedikit terlambat.
 */
const AMBANG_PERPANJANG = 0.5;

/**
 * Terbitkan & verifikasi token sesi lokal (JWT) — SKM menerbitkan sesinya sendiri
 * setelah login berhasil (dev-login sekarang, callback SSO OAuth2 nanti), sesuai
 * keputusan arsitektur: identitas dari IdP eksternal, sesi tetap milik SKM sendiri.
 *
 * Payload SENGAJA minimal (hanya `sub`=userId) — role/opdId/isActive selalu diambil
 * ULANG dari DB saat verifikasi (lihat SessionAuthProvider), bukan dipercaya dari
 * klaim token. Ini mencegah perubahan role/penonaktifan akun baru berlaku setelah
 * token lama kedaluwarsa — penting untuk sistem RBAC administratif seperti ini.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Jendela menganggur, detik. Sesi yang tak dipakai selama ini berakhir. */
  private get jendelaDetik(): number {
    return (this.config.get<number>('session.idleMinutes') ?? 60) * 60;
  }

  /** Umur maksimum sesi sejak login, detik. Tak dapat diperpanjang aktivitas. */
  private get paguDetik(): number {
    return (this.config.get<number>('session.ttlHours') ?? 12) * 3600;
  }

  private static get sekarang(): number {
    return Math.floor(Date.now() / 1000);
  }

  issue(userId: number, act?: Role): string {
    const abs = SessionService.sekarang + this.paguDetik;
    return this.tandaTangani({ sub: userId, ...(act ? { act } : {}), abs }, this.jendelaDetik);
  }

  /**
   * Token pengganti dengan jendela menganggur yang disegarkan. `abs` DIBAWA apa
   * adanya, dan jendelanya dipangkas bila melewatinya -- di situlah pagu
   * mutlaknya benar-benar berlaku.
   *
   * `null` berarti tak boleh diperpanjang: pagunya sudah lewat, atau tokennya
   * terbitan lama yang memang tak punya pagu.
   */
  perpanjang(payload: SessionPayload): string | null {
    if (typeof payload.abs !== 'number') {
      return null;
    }
    const sisaPagu = payload.abs - SessionService.sekarang;
    if (sisaPagu <= 0) {
      return null;
    }
    return this.tandaTangani(
      { sub: payload.sub, ...(payload.act ? { act: payload.act } : {}), abs: payload.abs },
      Math.min(this.jendelaDetik, sisaPagu),
    );
  }

  /** Sisa jendelanya sudah tinggal separuh atau kurang. */
  perluDiperpanjang(token: string): boolean {
    const payload = this.verify(token);
    if (!payload || typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp - SessionService.sekarang <= this.jendelaDetik * AMBANG_PERPANJANG;
  }

  private tandaTangani(payload: SessionPayload, umurDetik: number): string {
    return this.jwtService.sign(payload, { expiresIn: Math.max(1, Math.floor(umurDetik)) });
  }

  /**
   * `sub` WAJIB berupa angka (2026-08-27). Sejak SsoStateService ikut
   * menandatangani token dengan kunci yang SAMA, ada JWT sah-tanda-tangan yang
   * BUKAN token sesi (token `state` berpayload `{ typ: 'sso_state', n }`).
   * Tanpa pemeriksaan ini, token semacam itu lolos verifikasi lalu diteruskan
   * ke `prisma.user.findUnique({ where: { id: undefined } })` dan meledak jadi
   * 500 -- bukan celah akses, tapi galat yang menyesatkan. Ditolak di sini
   * supaya jawabannya 401 yang jujur.
   */
  verify(token: string): SessionPayload | null {
    try {
      const payload = this.jwtService.verify<Partial<SessionPayload>>(token);
      if (typeof payload?.sub !== 'number') {
        this.logger.debug('Token bertanda-tangan sah tapi bukan token sesi (sub bukan angka)');
        return null;
      }
      // `act` yang bukan anggota enum DIABAIKAN, bukan membatalkan tokennya.
      // Hasilnya sama dengan "belum memilih" -- keadaan yang sudah ditangani
      // resolveActingRole dengan jujur -- sedangkan menolak seluruh tokennya
      // akan melaporkan "sesi tak sah" untuk sesi yang sebenarnya sah.
      const act =
        typeof payload.act === 'string' && (Object.values(Role) as string[]).includes(payload.act)
          ? (payload.act as Role)
          : undefined;
      return {
        sub: payload.sub,
        ...(act ? { act } : {}),
        ...(typeof payload.abs === 'number' ? { abs: payload.abs } : {}),
        ...(typeof payload.exp === 'number' ? { exp: payload.exp } : {}),
      };
    } catch (err) {
      this.logger.debug(`Token sesi tidak valid/kedaluwarsa: ${String(err)}`);
      return null;
    }
  }
}
