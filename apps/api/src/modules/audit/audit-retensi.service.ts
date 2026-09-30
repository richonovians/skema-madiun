import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * RETENSI LOG AUDIT (30 September 2026, permintaan pengguna: hapus otomatis
 * setelah dua minggu).
 *
 * Sebelum ini `audit_logs` tak pernah dipangkas sama sekali, dan itu keputusan
 * tersurat -- lihat komentar `@@index([timestamp])` di schema.prisma yang ikut
 * diluruskan bersama berkas ini. Yang berubah bukan sikap terhadap jejak audit,
 * melainkan bahwa sekarang ada KEBIJAKAN: batas waktu tetap, dibaca dari env,
 * sama untuk semua baris, dan dinyatakan kepada pembacanya di halaman Log
 * Aktivitas. Pemangkasan berdasar kebijakan berbeda dari penghapusan sesuka
 * hati, dan bedanya justru terletak pada dinyatakan atau tidaknya.
 *
 * PENJADWAL DI DALAM APLIKASI, bukan cron sistem. Repo ini belum punya artefak
 * penyebaran produksi (docker-compose.yml menyatakan dirinya khusus
 * pengembangan), dan penyebarannya dikerjakan tim lain di server yang bukan kita
 * kendalikan. Mekanisme yang menuntut mereka memasang cron adalah mekanisme yang
 * besar kemungkinannya tak pernah dipasang -- dan kebijakan retensi yang tak
 * pernah berjalan lebih buruk daripada tak punya kebijakan, sebab sistemnya
 * mengaku menyimpan 14 hari sementara kenyataannya menyimpan selamanya.
 *
 * TIMER SENDIRI, BUKAN @nestjs/schedule. Paket itu sudah dicoba dan dibuang
 * lagi karena dua sebab terukur: versi terbarunya (12) ESM-only sehingga jest
 * repo ini -- yang berjalan CommonJS -- menolak memuatnya, dan versi CJS
 * terakhir yang mendukung Nest 11 (6.0.1) menarik `cron` beserta `luxon`. Tiga
 * paket dan sebuah pustaka tanggal penuh untuk satu pekerjaan harian tak
 * sepadan, sementara yang dibutuhkan -- penjadwal yang ikut terbawa bersama
 * aplikasinya -- sudah dicapai `setTimeout`.
 *
 * Banyak instance TIDAK menjadi masalah: penghapusannya idempoten
 * (`timestamp < batas`), jadi instance kedua tak menemukan apa pun.
 *
 * TANPA JEJAK DI `audit_logs` ITU SENDIRI, dan itu keputusan sadar (pengguna,
 * 30 September 2026). `audit_logs.actor_id` NOT NULL ber-FK ke `users`, jadi
 * mencatat pemangkasan menuntut sebuah akun -- dan akun itu akan muncul di
 * Manajemen User, sebab `UsersService.findAll` hanya menyaring `deletedAt`.
 * Lebih menentukan lagi: catatan itu tinggal di tabel yang sama, sehingga
 * pemangkasan berikutnya menghapusnya juga. Jejaknya punah tepat pada saat
 * dibutuhkan. Penggantinya: log aplikasi di sisi server, plus keterangan
 * retensi di halaman Log Aktivitas yang menerangkan kekosongannya SEBELUM ada
 * yang bertanya.
 */

/**
 * Batas bawah yang menolak berjalan. Bukan angka kehati-hatian belaka: satu
 * digit hilang mengubah 14 menjadi 1, dan itu memusnahkan hampir seluruh log
 * dalam satu lintasan yang tak dapat dibatalkan.
 */
export const RETENSI_MINIMUM_HARI = 7;

/**
 * Baris per putaran penghapusan. Halaman Log Aktivitas membaca tabel yang sama,
 * dan satu `deleteMany` raksasa menahannya lama pada tabel yang sudah berisi
 * ribuan baris.
 */
export const UKURAN_KELOMPOK = 5000;

/** Jam server saat pemangkasan berjalan -- jam sepi, di luar jam kerja. */
export const JAM_JALAN = 3;

const MILIDETIK_PER_HARI = 24 * 60 * 60 * 1000;

export type HasilPangkas =
  | { dijalankan: false; alasan: 'tidak-disetel' }
  | { dijalankan: false; alasan: 'terlalu-pendek'; hari: number }
  | { dijalankan: true; kering: boolean; hari: number; batas: Date; jumlah: number };

export interface OpsiPangkas {
  /** Hitung saja, jangan hapus. */
  kering?: boolean;
  /** Waktu acuan; disuntik oleh uji supaya batasnya dapat diperiksa tepat. */
  sekarang?: Date;
}

@Injectable()
export class AuditRetensiService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuditRetensiService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.hariRetensi() === null) {
      // Tak ada timer sama sekali bila retensi tak dinyalakan. Memasang timer
      // yang setiap hari memutuskan untuk tak berbuat apa-apa hanya menambah
      // satu hal yang harus dipahami orang berikutnya.
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

  /** Lama retensi yang berlaku, atau `null` bila retensi tidak dinyalakan. */
  hariRetensi(): number | null {
    const nilai = this.config.get<number | null>('audit.retentionDays');
    return typeof nilai === 'number' && Number.isFinite(nilai) ? nilai : null;
  }

  /** Baris dengan `timestamp` sebelum nilai ini sudah kedaluwarsa. */
  batasWaktu(hari: number, sekarang: Date = new Date()): Date {
    return new Date(sekarang.getTime() - hari * MILIDETIK_PER_HARI);
  }

  /**
   * Milidetik dari `sekarang` sampai `JAM_JALAN` berikutnya, waktu setempat.
   *
   * Dihitung menuju jam tertentu, bukan `setInterval` 24 jam sejak boot: yang
   * kedua membuat jam pemangkasan bergeser mengikuti kapan server terakhir
   * di-restart, sehingga pada server yang sering dideploy ia bisa jatuh tepat
   * di jam sibuk.
   */
  jedaKeJamJalan(sekarang: Date = new Date()): number {
    const berikutnya = new Date(sekarang);
    berikutnya.setHours(JAM_JALAN, 0, 0, 0);
    if (berikutnya.getTime() <= sekarang.getTime()) {
      berikutnya.setDate(berikutnya.getDate() + 1);
    }
    return berikutnya.getTime() - sekarang.getTime();
  }

  async pangkas(opsi: OpsiPangkas = {}): Promise<HasilPangkas> {
    const hari = this.hariRetensi();
    if (hari === null) {
      // TIDAK dicatat sebagai peringatan: tak menyalakan retensi adalah keadaan
      // yang sah, dan memperingatkannya setiap hari hanya mengajari pembaca log
      // mengabaikan peringatan.
      return { dijalankan: false, alasan: 'tidak-disetel' };
    }

    if (hari < RETENSI_MINIMUM_HARI && !this.config.get<boolean>('audit.retentionAllowShort')) {
      this.logger.warn(
        `AUDIT_RETENTION_DAYS=${hari} di bawah batas ${RETENSI_MINIMUM_HARI} hari — ` +
          'pemangkasan TIDAK dijalankan. Bila nilai itu memang disengaja, setel ' +
          'AUDIT_RETENTION_ALLOW_SHORT=true.',
      );
      return { dijalankan: false, alasan: 'terlalu-pendek', hari };
    }

    const batas = this.batasWaktu(hari, opsi.sekarang);
    const where = { timestamp: { lt: batas } };

    if (opsi.kering) {
      const jumlah = await this.prisma.auditLog.count({ where });
      return { dijalankan: true, kering: true, hari, batas, jumlah };
    }

    let jumlah = 0;
    for (;;) {
      // Id dipilih lebih dulu lalu dihapus menurut id, sebab Prisma
      // `deleteMany` tak punya LIMIT. Diurutkan `id asc` supaya tiap putaran
      // mengambil kelompok berikutnya dan pengulangannya pasti berakhir.
      const kelompok = await this.prisma.auditLog.findMany({
        where,
        select: { id: true },
        take: UKURAN_KELOMPOK,
        orderBy: { id: 'asc' },
      });
      if (kelompok.length === 0) {
        break;
      }
      const { count } = await this.prisma.auditLog.deleteMany({
        where: { id: { in: kelompok.map((baris) => baris.id) } },
      });
      jumlah += count;
      if (kelompok.length < UKURAN_KELOMPOK) {
        break;
      }
    }

    return { dijalankan: true, kering: false, hari, batas, jumlah };
  }

  async jalankanTerjadwal(): Promise<void> {
    try {
      const hasil = await this.pangkas();
      if (!hasil.dijalankan) {
        return;
      }
      // SATU-SATUNYA jejak pemangkasan, jadi ia memuat keduanya: batas waktunya
      // dan jumlah barisnya. Tingkat `log`, bukan `debug` -- ia harus terbaca
      // tanpa menyetel apa pun lebih dahulu.
      this.logger.log(
        `Retensi audit: ${hasil.jumlah} baris dibuang, lebih tua dari ` +
          `${hasil.batas.toISOString()} (${hasil.hari} hari).`,
      );
    } catch (err) {
      // Pekerjaan latar yang melempar menjadi unhandled rejection dan dapat
      // menjatuhkan proses API. Retensi tak sepadan dengan itu; ia akan dicoba
      // lagi besok.
      this.logger.error(
        `Retensi audit gagal: ${(err as Error)?.message ?? err}`,
        (err as Error)?.stack,
      );
    }
  }

  private jadwalkanBerikutnya(): void {
    this.timer = setTimeout(() => {
      void this.jalankanTerjadwal().finally(() => this.jadwalkanBerikutnya());
    }, this.jedaKeJamJalan());
    // `unref` supaya timer yang menunggu TIDAK menahan proses tetap hidup.
    // Pada server, HTTP listener-nya yang menahan proses, jadi timer ini tetap
    // menyala; pada uji dan perkakas baris perintah, tanpa `unref` prosesnya
    // menggantung sampai jam 03.00 -- kegagalan yang persis pernah terjadi di
    // sesi ini pada handle lain dan sangat mahal untuk didiagnosis.
    this.timer.unref?.();
  }
}
