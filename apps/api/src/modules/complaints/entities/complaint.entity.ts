import { ApiProperty } from '@nestjs/swagger';
import { ComplaintStatus, TingkatPengaduan } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ComplaintAttachmentEntity } from './complaint-attachment.entity';
import { ComplaintStatusHistoryEntity } from './complaint-status-history.entity';

export class ComplaintEntity extends BaseEntity<ComplaintEntity> {
  id: number;
  ticketNo: string;
  /**
   * DIHILANGKAN seluruhnya pada pengaduan anonim (bukan `null`/`0`). Nilai apa
   * pun yang tetap dikirim membuka celah bagi kode klien yang kelak membacanya
   * tanpa memeriksa `isAnonim`.
   */
  userId?: number;
  /**
   * `null` berarti pengaduan ini BELUM BERTUJUAN — pengirimnya tak tahu harus
   * ditujukan kepada siapa (6 September 2026). Admin Kabupaten
   * mengisinya lewat `PATCH /complaints/:id/opd`.
   */
  opdId: number | null;
  kategori: string;
  /**
   * Cakupan pengaduan (4 November 2026). Dikirim ke klien supaya daftar &
   * detail dapat MENAMPILKANNYA -- tingkatnya tak dapat disimpulkan dari OPD
   * tujuan, sebab pengaduan tanpa tujuan juga punya tingkat.
   */
  @ApiProperty({ enum: TingkatPengaduan })
  tingkat: TingkatPengaduan;
  judul: string;
  uraian: string;
  /**
   * Kapan & di mana kejadiannya (4 November 2026). `null` berarti pengaduan
   * ini dibuat SEBELUM kedua medan ini ada -- bukan "pelapornya mengosongkan",
   * sebab keduanya wajib di `CreateComplaintDto`. Tampilan menyembunyikan
   * barisnya alih-alih menggambar tanda hubung.
   */
  tanggalKejadian: Date | null;
  /** Didekripsi di `toEntity`, satu chokepoint dengan `uraian`. */
  lokasiKejadian: string | null;
  status: ComplaintStatus;
  /**
   * Perjalanan tiket ini, terlama dulu (4 November 2026).
   *
   * HANYA pada `GET /complaints/:ticketNo`. Daftar pengaduan tak
   * menggambarnya, dan menariknya per baris berarti satu kueri tambahan untuk
   * seratus baris demi data yang tak satu pun kolomnya dipakai -- alasan yang
   * sama dengan `reporterNik` di bawah.
   *
   * Baris TERAKHIRNYA tak selalu sama dengan `status` di atas: pengaduan yang
   * baru masuk hanya punya satu baris, `terkirim`, sementara statusnya sudah
   * `menunggu_verifikasi`. Keduanya benar; lihat enum `ComplaintStatus`.
   */
  statusHistory?: ComplaintStatusHistoryEntity[];
  /**
   * Pengaduan dikirim tanpa identitas. Bukan data identitas, jadi TETAP dikirim
   * ke admin -- justru inilah yang memberi tahu antarmuka untuk menampilkan
   * "Anonim" alih-alih tanda hubung tanpa keterangan.
   */
  isAnonim: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachments?: ComplaintAttachmentEntity[];
  /** Nama pelapor. Hanya diisi pada `GET /complaints` (INT-11). */
  reporterNama?: string;
  /**
   * NIK, nomor HP, & alamat pelapor (1 Oktober 2026). HANYA pada
   * `GET /complaints/:ticketNo` -- daftar pengaduan tak menggambar satu pun
   * dari ketiganya, dan menariknya per baris berarti NIK serta alamat rumah
   * puluhan orang melintas di respons yang tak memerlukannya.
   *
   * `null` BERBEDA dari tidak ada, dan bedanya dipakai. `null` berarti
   * Helpdesk memang tak mengirimkan medan itu untuk orang ini -- keadaan
   * NORMAL, sebab SSO melayani ASN maupun warga umum -- dan tampilan
   * menyembunyikan barisnya alih-alih menggambar tanda hubung. Ketiadaan
   * kuncinya berarti pengaduan ini anonim; lihat `toEntity`.
   */
  reporterNik?: string | null;
  reporterNomorHp?: string | null;
  reporterAlamat?: string | null;
  /** Nama OPD tujuan. Diisi pada `GET /complaints` & `GET /complaints/:ticketNo` (INT-18). */
  opdNama?: string;
}
