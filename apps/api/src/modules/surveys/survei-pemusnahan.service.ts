import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { operasiPemusnahanSurvei } from './survey-pemusnahan.util';

/**
 * PEMUSNAHAN OTOMATIS SURVEI DI SAMPAH (30 September 2026, permintaan pengguna:
 * berjalan otomatis dengan jangka waktu setahun).
 *
 * Sampah survei sudah ada sejak 11 September 2026, tetapi isinya tak pernah
 * berkurang sendiri. Yang ditambahkan di sini adalah KEBIJAKAN umurnya: batas
 * tetap, dibaca dari env, sama untuk semua baris, dan dinyatakan kepada
 * pembacanya di halaman Sampah. Sama seperti retensi log audit, bedanya
 * pemangkasan berdasar kebijakan dengan penghapusan sesuka hati terletak pada
 * dinyatakan atau tidaknya.
 *
 * HANYA SURVEI TANPA RESPONS (keputusan pengguna). Sebuah survei yang sudah
 * dijawab warga memuat hasil pengukuran IKM, dan lewatnya waktu bukan alasan
 * yang cukup untuk memusnahkannya. Survei semacam itu tetap tinggal di Sampah
 * sampai ada orang yang memutuskan. Saringan `responses: { none: {} }`
 * itulah sifat terpenting berkas ini, dan ia dijaga uji tersendiri.
 *
 * MENYALA SECARA BAKU, berbeda dari AuditRetensiService yang mati kecuali
 * dinyalakan. Perbedaan itu disengaja dan berasal dari permintaannya: yang satu
 * kebijakan penyimpanan yang harus dipilih sadar, yang ini fitur yang diminta
 * berjalan sendiri. `SURVEY_PURGE_ENABLED=false` mematikannya.
 *
 * TIMER SENDIRI, BUKAN @nestjs/schedule, dengan alasan yang sama persis seperti
 * pada AuditRetensiService: versi terbarunya ESM-only sehingga jest repo ini
 * menolak memuatnya, dan versi CJS terakhir yang mendukung Nest 11 menarik
 * `cron` beserta `luxon`.
 *
 * JAM 04.00, bukan 03.00. Pemangkas log audit sudah memakai jam 03.00, dan dua
 * pekerjaan berat yang menyentuh basis data pada menit yang sama tak ada
 * untungnya.
 *
 * TANPA JEJAK DI `audit_logs`, dan itu keputusan yang sama dengan retensi audit
 * (pengguna, 30 September 2026). `audit_logs.actor_id` NOT NULL ber-FK ke
 * `users`, sedangkan pekerjaan terjadwal tak punya aktor. Jejaknya di log
 * aplikasi, ditambah keterangan kebijakan di halaman Sampah yang menerangkan
 * kekosongannya sebelum ada yang bertanya. Pemusnahan MANUAL tetap tercatat,
 * sebab ia punya pelaku.
 */

/**
 * Batas bawah umur Sampah yang menolak berjalan. Satu digit hilang mengubah 365
 * menjadi 36, dan Sampah adalah tempat orang menaruh sesuatu justru karena
 * belum yakin hendak membuangnya.
 */
export const PEMUSNAHAN_MINIMUM_HARI = 30;

/**
 * Banyaknya survei yang dimusnahkan dalam satu lintasan. Sisanya menunggu
 * besok; lihat alasan tak adanya pengulangan di `pangkas`.
 */
export const UKURAN_KELOMPOK = 200;

/** Jam server saat pemusnahan berjalan -- jam sepi, dan bukan jam milik audit. */
export const JAM_JALAN = 4;

const MILIDETIK_PER_HARI = 24 * 60 * 60 * 1000;

export type HasilPemusnahan =
  | { dijalankan: false; alasan: 'dimatikan' }
  | { dijalankan: false; alasan: 'terlalu-pendek'; hari: number }
  | { dijalankan: true; kering: boolean; hari: number; batas: Date; jumlah: number };

export interface OpsiPemusnahan {
  /** Hitung saja, jangan musnahkan. */
  kering?: boolean;
  /** Waktu acuan; disuntik oleh uji supaya batasnya dapat diperiksa tepat. */
  sekarang?: Date;
}

@Injectable()
export class SurveiPemusnahanService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SurveiPemusnahanService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.hariPemusnahan() === null) {
      // Tak ada timer sama sekali bila kebijakannya dimatikan. Timer yang
      // setiap hari memutuskan untuk tak berbuat apa-apa hanya menambah satu
      // hal yang harus dipahami orang berikutnya.
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

  /** Umur Sampah yang berlaku, atau `null` bila kebijakannya dimatikan. */
  hariPemusnahan(): number | null {
    if (this.config.get<boolean>('survey.purgeEnabled') === false) {
      return null;
    }
    const nilai = this.config.get<number>('survey.purgeDays');
    return typeof nilai === 'number' && Number.isFinite(nilai) ? nilai : null;
  }

  /** Survei yang `deletedAt`-nya sebelum nilai ini sudah kedaluwarsa. */
  batasWaktu(hari: number, sekarang: Date = new Date()): Date {
    return new Date(sekarang.getTime() - hari * MILIDETIK_PER_HARI);
  }

  /**
   * Milidetik dari `sekarang` sampai `JAM_JALAN` berikutnya, waktu setempat.
   *
   * Dihitung menuju jam tertentu, bukan `setInterval` 24 jam sejak boot: yang
   * kedua membuat jam pemusnahan bergeser mengikuti kapan server terakhir
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

  async pangkas(opsi: OpsiPemusnahan = {}): Promise<HasilPemusnahan> {
    const hari = this.hariPemusnahan();
    if (hari === null) {
      // TIDAK dicatat sebagai peringatan: mematikan kebijakan ini adalah
      // keadaan yang sah, dan memperingatkannya setiap hari hanya mengajari
      // pembaca log mengabaikan peringatan.
      return { dijalankan: false, alasan: 'dimatikan' };
    }

    if (hari < PEMUSNAHAN_MINIMUM_HARI && !this.config.get<boolean>('survey.purgeAllowShort')) {
      this.logger.warn(
        `SURVEY_PURGE_DAYS=${hari} di bawah batas ${PEMUSNAHAN_MINIMUM_HARI} hari — ` +
          'pemusnahan TIDAK dijalankan. Bila nilai itu memang disengaja, setel ' +
          'SURVEY_PURGE_ALLOW_SHORT=true.',
      );
      return { dijalankan: false, alasan: 'terlalu-pendek', hari };
    }

    const batas = this.batasWaktu(hari, opsi.sekarang);
    // SATU-SATUNYA tempat saringannya ditulis, dipakai mode kering maupun
    // sungguhan. Mode kering yang menghitung dengan saringan berbeda dari yang
    // dipakai saat memusnahkan adalah mode kering yang berbohong.
    const where: Prisma.SurveyWhereInput = {
      deletedAt: { lt: batas },
      responses: { none: {} },
    };

    if (opsi.kering) {
      const jumlah = await this.prisma.survey.count({ where });
      return { dijalankan: true, kering: true, hari, batas, jumlah };
    }

    // SATU KELOMPOK PER LINTASAN, tanpa pengulangan sampai habis. Pola "ambil
    // lalu hapus sampai kosong" berputar selamanya bila satu survei gagal
    // dimusnahkan terus-menerus: ia terus terambil, terus gagal, dan tak pernah
    // berkurang. Sisanya menunggu lintasan besok, dan isi Sampah yang berumur
    // setahun tak pernah mendesak.
    const kandidat = await this.prisma.survey.findMany({
      where,
      select: { id: true },
      take: UKURAN_KELOMPOK,
      orderBy: { id: 'asc' },
    });

    let jumlah = 0;
    for (const { id } of kandidat) {
      // SATU TRANSAKSI PER SURVEI. Satu survei bermasalah tak boleh
      // menggagalkan seluruh lintasan malam itu, dan tiap survei tetap
      // dimusnahkan utuh atau tidak sama sekali.
      await this.prisma.$transaction(operasiPemusnahanSurvei(this.prisma, id));
      jumlah += 1;
    }

    return { dijalankan: true, kering: false, hari, batas, jumlah };
  }

  async jalankanTerjadwal(): Promise<void> {
    try {
      const hasil = await this.pangkas();
      if (!hasil.dijalankan) {
        return;
      }
      if (hasil.jumlah === 0) {
        return;
      }
      // SATU-SATUNYA jejak pemusnahan otomatis, jadi ia memuat keduanya: batas
      // umurnya dan jumlah surveinya. Tingkat `log`, bukan `debug` -- ia harus
      // terbaca tanpa menyetel apa pun lebih dahulu.
      this.logger.log(
        `Pemusnahan Sampah survei: ${hasil.jumlah} survei tanpa respons dibuang, ` +
          `dibuang ke Sampah sebelum ${hasil.batas.toISOString()} (${hasil.hari} hari).`,
      );
    } catch (err) {
      // Pekerjaan latar yang melempar menjadi unhandled rejection dan dapat
      // menjatuhkan proses API. Pemusnahan tak sepadan dengan itu; ia akan
      // dicoba lagi besok.
      this.logger.error(
        `Pemusnahan Sampah survei gagal: ${(err as Error)?.message ?? err}`,
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
    // menggantung sampai jam jalan berikutnya.
    this.timer.unref?.();
  }
}
