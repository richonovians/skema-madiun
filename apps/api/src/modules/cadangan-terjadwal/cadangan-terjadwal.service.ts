import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * CADANGAN HARIAN TERJADWAL (BUG-073, 12 November 2026).
 *
 * PRD §10 meminta "backup database terjadwal harian"; sampai hari ini yang ada
 * hanya perintah tangan `pnpm cadangan`. Keputusan pengguna: penjadwalnya DI
 * DALAM aplikasi, dengan alasan yang sama seperti `AuditRetensiService` --
 * penggelaran dikerjakan tim lain di server yang tak kita kendalikan, dan cron
 * yang menuntut mereka memasangnya besar kemungkinannya tak pernah dipasang.
 * Timer sendiri, bukan `@nestjs/schedule`, dengan alasan yang tertulis di
 * berkas itu.
 *
 * SKRIPNYA DIPAKAI ULANG, BUKAN DITULIS ULANG. `scripts/cadangan.cjs` dijalankan
 * sebagai proses anak: satu implementasi yang sudah terukur (437 MB dalam 17
 * detik, QA-PERF), dan memorinya terpisah dari proses API yang sedang melayani.
 *
 * Yang TETAP tanggung jawab tim server, dan tak dapat diganti kode apa pun:
 * `pg_dump` 18 terpasang di server API, `BACKUP_DIR` menunjuk penyimpanan di
 * LUAR mesin ini, dan `BACKUP_ENCRYPTION_KEY` tersimpan. Bila salah satunya
 * tak ada, cadangan gagal setiap malam -- dan notifikasi kegagalannya itulah
 * peringatan yang dimaksud.
 */

/** Batas waktu satu cadangan. Dump 437 MB selesai dalam 17 detik. */
export const BATAS_WAKTU_MS = 60 * 60 * 1000;

/**
 * Kunci advisory Postgres yang memastikan SATU cadangan per giliran walau API
 * berjalan di beberapa instance. Angkanya sembarang tetapi tetap; diturunkan
 * dari huruf "SKMCADANG" supaya tak bertabrakan dengan kunci lain secara
 * kebetulan.
 */
export const KUNCI_ADVISORY = 0x534b4d434144;

/** WIB tidak mengenal waktu musim panas, jadi selisihnya tetap. */
const SELISIH_WIB_MS = 7 * 60 * 60 * 1000;
const MILIDETIK_PER_HARI = 24 * 60 * 60 * 1000;

/** Nama folder buatan `cadangan.cjs`: `skm-YYYYMMDD-HHMMSS`, stempelnya UTC. */
const POLA_FOLDER = /^skm-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/;

/** Potongan keluaran skrip yang ikut ke log saat gagal. */
const PANJANG_PESAN_MAKS = 2000;

export type HasilSkrip = { ok: true } | { ok: false; pesan: string };
export type HasilCadangan =
  | { status: 'dilewati' }
  | { status: 'berhasil'; dipangkas: string[] }
  | { status: 'gagal'; pesan: string };

@Injectable()
export class CadanganTerjadwalService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CadanganTerjadwalService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifikasi: NotificationsService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.dir()) {
      // MENYALA, tidak menolak boot (keputusan pengguna 12 November 2026):
      // go-live tak boleh tertahan bila penyimpanannya belum siap. Tetapi di
      // produksi kekurangannya harus terlihat setiap kali API menyala.
      if (this.config.get<string>('app.nodeEnv') === 'production') {
        this.logger.error(
          'Cadangan harian TIDAK menyala: BACKUP_DIR belum disetel. PRD §10 meminta ' +
            'cadangan terjadwal harian; lihat BACKUP_DIR di apps/api/.env.example dan ' +
            'docs/keamanan/enkripsi-at-rest.md §3.1.',
        );
      }
      return;
    }
    this.jadwalkanBerikutnya();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
  }

  /**
   * Milidetik dari `sekarang` sampai jam `BACKUP_JAM` WIB berikutnya.
   *
   * WIB TERSURAT, bukan jam server -- inilah bedanya dari `AuditRetensiService`.
   * Server produksi bisa berjalan dalam UTC, dan 02.00 UTC adalah 09.00 WIB:
   * cadangan akan berjalan di jam kerja. Tepat pada jamnya menunggu sehari
   * penuh, bukan nol, supaya tak berjalan dua kali beruntun.
   */
  jedaKeJamJalan(sekarang: Date = new Date()): number {
    const jam = this.config.get<number>('backup.jam') ?? 2;
    const wib = new Date(sekarang.getTime() + SELISIH_WIB_MS);
    const target = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), jam);
    let jeda = target - wib.getTime();
    if (jeda <= 0) {
      jeda += MILIDETIK_PER_HARI;
    }
    return jeda;
  }

  /**
   * Satu giliran cadangan. TIDAK PERNAH melempar: pekerjaan latar yang melempar
   * menjadi unhandled rejection dan dapat menjatuhkan API.
   */
  async jalankan(sekarang: Date = new Date()): Promise<HasilCadangan> {
    const dir = this.dir();
    if (!dir) {
      return { status: 'dilewati' };
    }

    let hasil: HasilCadangan;
    try {
      // Kunci tingkat TRANSAKSI, bukan sesi: Prisma memakai pool koneksi, dan
      // kunci sesi yang diambil di satu koneksi bisa dilepas di koneksi lain.
      // Transaksinya dibiarkan terbuka selama cadangan berjalan -- ia hanya
      // memegang kunci, tak membaca maupun menulis apa pun.
      hasil = await this.prisma.$transaction(
        async (tx) => {
          const [baris] = await tx.$queryRaw<{ dapat: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${KUNCI_ADVISORY}::bigint) AS dapat`;
          if (!baris?.dapat) {
            return { status: 'dilewati' } as const;
          }
          return this.cadangkan(dir, sekarang);
        },
        { timeout: BATAS_WAKTU_MS + 60_000, maxWait: 10_000 },
      );
    } catch (err) {
      hasil = { status: 'gagal', pesan: err instanceof Error ? err.message : String(err) };
    }

    if (hasil.status === 'gagal') {
      this.logger.error(`Cadangan harian GAGAL: ${hasil.pesan}`);
      await this.notifikasi.notifyBackupFailed(sekarang);
    } else if (hasil.status === 'berhasil') {
      this.logger.log(
        `Cadangan harian selesai di ${dir}. Dipangkas: ${hasil.dipangkas.length} cadangan lama` +
          (hasil.dipangkas.length ? ` (${hasil.dipangkas.join(', ')}).` : '.'),
      );
    }
    return hasil;
  }

  private async cadangkan(dir: string, sekarang: Date): Promise<HasilCadangan> {
    let skrip: HasilSkrip;
    try {
      skrip = await this.jalankanSkrip(dir);
    } catch (err) {
      skrip = { ok: false, pesan: err instanceof Error ? err.message : String(err) };
    }
    if (!skrip.ok) {
      // Retensi TIDAK dijalankan: rentetan kegagalan tak boleh ikut memusnahkan
      // cadangan lama yang masih baik.
      return { status: 'gagal', pesan: skrip.pesan };
    }
    const hari = this.config.get<number>('backup.retentionDays') ?? 14;
    return { status: 'berhasil', dipangkas: this.pangkasCadanganLama(dir, hari, sekarang) };
  }

  /**
   * Menjalankan `scripts/cadangan.cjs` sebagai proses anak.
   *
   * Jalurnya dari `process.cwd()`, sama dengan `UPLOAD_DIR` yang juga dibaca
   * relatif terhadap direktori kerja API (`apps/api`). Lingkungannya diwariskan
   * apa adanya: `DATABASE_URL` dan kedua kunci sudah dimuat ConfigModule ke
   * `process.env`.
   */
  jalankanSkrip(dir: string): Promise<HasilSkrip> {
    const skrip = path.resolve(process.cwd(), 'scripts', 'cadangan.cjs');
    return new Promise((resolve) => {
      const anak = spawn(process.execPath, [skrip, '--keluar', dir], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let galat = '';
      anak.stderr.on('data', (d: Buffer) => {
        galat = (galat + String(d)).slice(-PANJANG_PESAN_MAKS);
      });
      const habisWaktu = setTimeout(() => {
        anak.kill();
        galat += `\nDihentikan: melewati batas waktu ${BATAS_WAKTU_MS / 60000} menit.`;
      }, BATAS_WAKTU_MS);
      anak.on('error', (err) => {
        clearTimeout(habisWaktu);
        resolve({ ok: false, pesan: err.message });
      });
      anak.on('close', (kode) => {
        clearTimeout(habisWaktu);
        resolve(
          kode === 0 ? { ok: true } : { ok: false, pesan: galat.trim() || `kode keluar ${kode}` },
        );
      });
    });
  }

  /**
   * Menghapus folder cadangan yang lebih tua dari `hari`.
   *
   * Umur dibaca dari NAMA foldernya, bukan `mtime`: `BACKUP_DIR` lazimnya folder
   * jaringan, dan waktu ubah di sana mengikuti jam mesin lain atau berubah saat
   * disalin. Yang tak cocok pola persis `skm-<stempel>`, atau bukan folder,
   * TAK PERNAH disentuh -- folder itu bisa berisi apa saja milik tim server.
   */
  pangkasCadanganLama(dir: string, hari: number, sekarang: Date = new Date()): string[] {
    const batas = sekarang.getTime() - hari * MILIDETIK_PER_HARI;
    const dipangkas: string[] = [];
    for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
      const cocok = POLA_FOLDER.exec(entri.name);
      if (!entri.isDirectory() || !cocok) {
        continue;
      }
      const [, th, bl, tg, j, m, d] = cocok.map(Number);
      if (Date.UTC(th, bl - 1, tg, j, m, d) < batas) {
        fs.rmSync(path.join(dir, entri.name), { recursive: true, force: true });
        dipangkas.push(entri.name);
      }
    }
    return dipangkas.sort();
  }

  private dir(): string | null {
    const nilai = this.config.get<string | null>('backup.dir');
    return nilai ? nilai : null;
  }

  private jadwalkanBerikutnya(): void {
    this.timer = setTimeout(() => {
      void this.jalankan().finally(() => this.jadwalkanBerikutnya());
    }, this.jedaKeJamJalan());
    // Timer ini tak boleh menahan proses tetap hidup saat API dimatikan.
    this.timer.unref();
  }
}
